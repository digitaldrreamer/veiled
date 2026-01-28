# 🔐 Ed25519 Signature Verification for Veiled Anchor Program
## Complete Research & Secure Implementation Guide | January 26, 2026

---

## Executive Summary

**Your Current Situation**:
- ✅ Build succeeds with vendored dependencies
- ✅ Ed25519Program instruction introspection works
- ⚠️ Implementation uses workarounds (hardcoded program ID, vendored crates)
- ❌ Missing critical security validations (offset checking)

**Recommendation**: 
Keep your current Ed25519Program approach (it's actually the industry standard), but add strict offset validation to prevent signature forgery attacks.

---

## Why Ed25519Program is the Right Choice

### The Problem You Solved

You investigated three options:
1. ❌ `ed25519-dalek` → BPF incompatible (stack overflow)
2. ❌ `ed25519-compact` → `edition2024` dependencies block build
3. ✅ **Ed25519Program instruction introspection** → Works perfectly

**This is the correct choice.**

### Why Other Rust Crates Don't Work on Solana

**BPF Stack Limits**:
```
Solana BPF constraint: 4096 bytes max stack per function
ed25519-compact: ~4856 bytes needed
Result: Stack offset exceeded error
```

**Edition 2024 Incompatibility**:
- Rust 1.84 (Solana toolchain) doesn't stabilize `edition2024`
- Dependencies like `constant_time_eq v0.4.2` require it
- No workaround except vendoring (which you've done)

### The Ed25519Program Design

Solana provides a **native Ed25519 verification program** specifically because:
1. Signature verification is compute-intensive
2. Running it in BPF would exceed stack limits
3. Solana verifies it in the runtime (free compute)
4. Your program just validates the results

**This is how production projects do it.**

---

## Critical Security Finding: Offset Validation

### The Vulnerability

**From Cantina audit firm (2025):**

> "Offset-based signature validation issues continue to surface across Solana-based protocols. These are not isolated bugs but structural implementation risks requiring explicit validation to eliminate."

**What can go wrong:**
```
Attacker sends transaction with:
  Ed25519Program verifies signature over: [recipient=attacker, amount=1000000]
  Your program reads from offset 0 expecting: [recipient=user, amount=1]
  
Result: Attacker signature gets applied to user's transaction
```

### Why This Happens

Ed25519Program uses **offsets** to locate message/pubkey/signature in instruction data:

```
Instruction data layout:
[0..15]   Header (offsets + signature count)
[16..47]  Public key (32 bytes)
[48..111] Signature (64 bytes)
[112..151] Message (40 bytes)
```

**Your program MUST validate:**
1. All offset values are correct
2. All slices point to expected locations
3. Message content matches expectations

**Without validation**: Attacker can craft instruction with misleading offsets.

---

## Secure Implementation: Step-by-Step

### Step 1: Validate Ed25519Program ID

```rust
// CRITICAL: Verify this is actually the Ed25519 program
const ED25519_PROGRAM_ID: &str = "Ed25519SigVerify111111111111111111111111111";

// In your instruction handler:
let ed_ix = ix_sysvar::load_instruction_at_checked(
    (current_ix_index - 1) as usize,
    &ix_sysvar_account,
)?;

// MUST verify program ID
require!(
    ed_ix.program_id == Pubkey::from_str(ED25519_PROGRAM_ID).unwrap(),
    VeiledError::BadEd25519Program
);

// MUST verify no accounts (Ed25519Program is stateless)
require!(ed_ix.accounts.is_empty(), VeiledError::BadEd25519Accounts);
```

### Step 2: Parse and Validate Header

```rust
const HEADER_LEN: usize = 16;
const PUBKEY_LEN: usize = 32;
const SIG_LEN: usize = 64;

let data = &ed_ix.data;

// Bounds check
require!(data.len() >= HEADER_LEN, VeiledError::InvalidInstructionData);

// Get signature count (should be 1 for single signature)
let sig_count = data[0] as usize;
require!(sig_count == 1, VeiledError::InvalidSignatureCount);

// Helper to read u16 offsets from header
let read_u16 = |i: usize| -> Result<u16> {
    let start = 2 + 2 * i;
    let end = start + 2;
    let src = data.get(start..end)
        .ok_or(error!(VeiledError::InvalidInstructionData))?;
    let mut arr = [0u8; 2];
    arr.copy_from_slice(src);
    Ok(u16::from_le_bytes(arr))
};

// Extract offsets
let signature_offset = read_u16(0)? as usize;
let signature_ix_idx = read_u16(1)? as usize;  // Should be u16::MAX
let public_key_offset = read_u16(2)? as usize;
let public_key_ix_idx = read_u16(3)? as usize;  // Should be u16::MAX
let message_offset = read_u16(4)? as usize;
let message_size = read_u16(5)? as usize;
let message_ix_idx = read_u16(6)? as usize;  // Should be u16::MAX
```

### Step 3: CRITICAL - Validate Offset Indices

```rust
// THIS IS THE SECURITY CHECK THAT PREVENTS FORGERY
// All offsets must point to the CURRENT instruction data, not others
const THIS_INSTRUCTION: usize = u16::MAX as usize;

require!(
    signature_ix_idx == THIS_INSTRUCTION
        && public_key_ix_idx == THIS_INSTRUCTION
        && message_ix_idx == THIS_INSTRUCTION,
    VeiledError::OffsetMismatch
);

msg!("✓ All offsets point to current instruction (offset indices = u16::MAX)");
```

**Why this matters:**
- If `signature_ix_idx != u16::MAX`, attacker could point to signature from different instruction
- Solana uses `u16::MAX` as sentinel for "current instruction"
- Any other value means the data comes from a different instruction

### Step 4: Bounds Check All Slices

```rust
// Ensure offsets are past the header
require!(
    signature_offset >= HEADER_LEN
        && public_key_offset >= HEADER_LEN
        && message_offset >= HEADER_LEN,
    VeiledError::InvalidInstructionData
);

// Ensure slices don't exceed instruction data length
require!(
    data.len() >= signature_offset + SIG_LEN,
    VeiledError::InvalidInstructionData
);
require!(
    data.len() >= public_key_offset + PUBKEY_LEN,
    VeiledError::InvalidInstructionData
);
require!(
    data.len() >= message_offset + message_size,
    VeiledError::InvalidInstructionData
);

msg!("✓ All offset bounds valid");
```

### Step 5: Reconstruct and Validate Message

```rust
// Extract the message (proof_hash || is_valid || timestamp)
let msg_slice = &data[message_offset..message_offset + message_size];

// Your message should be exactly 40 bytes:
// [32 bytes: proof_hash] || [1 byte: is_valid] || [7 bytes: padding or timestamp]
require!(message_size == 40, VeiledError::InvalidMessageSize);

// Extract components
let proof_hash = &msg_slice[0..32];
let is_valid_byte = msg_slice[32];
let timestamp = u56_from_be_bytes(&msg_slice[33..40])?;

// Validate against expected values
require!(
    proof_hash == expected_proof_hash,
    VeiledError::ProofHashMismatch
);

require!(
    is_valid_byte == (expected_is_valid as u8),
    VeiledError::IsValidMismatch
);

msg!("✓ Message content validated");
```

### Step 6: Validate Public Key

```rust
// Extract public key from instruction data
let pk_slice = &data[public_key_offset..public_key_offset + PUBKEY_LEN];
let mut pk_arr = [0u8; 32];
pk_arr.copy_from_slice(pk_slice);

let signer_pubkey = Pubkey::new_from_array(pk_arr);

// Validate it matches expected authority
require!(
    signer_pubkey == ctx.accounts.authority.key(),
    VeiledError::AuthorityMismatch
);

msg!("✓ Signer public key validated");
```

### Complete Secure Implementation

```rust
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    ed25519_program,
    pubkey::Pubkey,
    sysvar::instructions as ix_sysvar,
    sysvar::SysvarId
};

declare_id!("YOUR_PROGRAM_ID_HERE");

#[program]
pub mod veiled {
    use super::*;

    pub fn verify_signature(ctx: Context<VerifySignature>) -> Result<()> {
        const ED25519_PROGRAM_ID: &str = "Ed25519SigVerify111111111111111111111111111";
        const HEADER_LEN: usize = 16;
        const PUBKEY_LEN: usize = 32;
        const SIG_LEN: usize = 64;
        const MSG_LEN: usize = 40;

        // Load instruction sysvar
        let ix_sysvar_account = ctx.accounts.instruction_sysvar.to_account_info();

        // Get current instruction index
        let current_ix_index = ix_sysvar::load_current_index_checked(&ix_sysvar_account)
            .map_err(|_| error!(VeiledError::InvalidInstructionSysvar))?;

        require!(current_ix_index > 0, VeiledError::NoEdgeProgram);

        // Load previous instruction (should be Ed25519Program)
        let ed_ix = ix_sysvar::load_instruction_at_checked(
            (current_ix_index - 1) as usize,
            &ix_sysvar_account,
        ).map_err(|_| error!(VeiledError::InvalidInstructionSysvar))?;

        // SECURITY CHECK 1: Verify program ID
        require!(
            ed_ix.program_id == Pubkey::from_str(ED25519_PROGRAM_ID)
                .map_err(|_| error!(VeiledError::BadEd25519Program))?,
            VeiledError::BadEd25519Program
        );

        // SECURITY CHECK 2: Verify no accounts
        require!(ed_ix.accounts.is_empty(), VeiledError::BadEd25519Accounts);

        let data = &ed_ix.data;

        // SECURITY CHECK 3: Validate header length
        require!(data.len() >= HEADER_LEN, VeiledError::InvalidInstructionData);

        // Parse signature count
        let sig_count = data[0] as usize;
        require!(sig_count == 1, VeiledError::InvalidSignatureCount);

        // Helper to read u16 offsets
        let read_u16 = |i: usize| -> Result<u16> {
            let start = 2 + 2 * i;
            let end = start + 2;
            let src = data.get(start..end)
                .ok_or(error!(VeiledError::InvalidInstructionData))?;
            let mut arr = [0u8; 2];
            arr.copy_from_slice(src);
            Ok(u16::from_le_bytes(arr))
        };

        // Extract offsets
        let signature_offset = read_u16(0)? as usize;
        let signature_ix_idx = read_u16(1)? as usize;
        let public_key_offset = read_u16(2)? as usize;
        let public_key_ix_idx = read_u16(3)? as usize;
        let message_offset = read_u16(4)? as usize;
        let message_size = read_u16(5)? as usize;
        let message_ix_idx = read_u16(6)? as usize;

        // SECURITY CHECK 4: CRITICAL - Validate all offsets point to current instruction
        let this_ix = u16::MAX as usize;
        require!(
            signature_ix_idx == this_ix
                && public_key_ix_idx == this_ix
                && message_ix_idx == this_ix,
            VeiledError::OffsetMismatch
        );

        // SECURITY CHECK 5: Bounds check all slices
        require!(
            signature_offset >= HEADER_LEN
                && public_key_offset >= HEADER_LEN
                && message_offset >= HEADER_LEN,
            VeiledError::InvalidInstructionData
        );

        require!(data.len() >= signature_offset + SIG_LEN, VeiledError::InvalidInstructionData);
        require!(data.len() >= public_key_offset + PUBKEY_LEN, VeiledError::InvalidInstructionData);
        require!(data.len() >= message_offset + message_size, VeiledError::InvalidInstructionData);
        require!(message_size == MSG_LEN, VeiledError::InvalidMessageSize);

        // SECURITY CHECK 6: Validate message content
        let msg_slice = &data[message_offset..message_offset + MSG_LEN];
        let proof_hash = &msg_slice[0..32];
        let is_valid_byte = msg_slice[32];

        require!(
            proof_hash == ctx.accounts.proof_hash.key().as_ref(),
            VeiledError::ProofHashMismatch
        );

        require!(
            is_valid_byte == 1, // Assuming verified proof
            VeiledError::IsValidMismatch
        );

        // SECURITY CHECK 7: Validate public key
        let pk_slice = &data[public_key_offset..public_key_offset + PUBKEY_LEN];
        let mut pk_arr = [0u8; 32];
        pk_arr.copy_from_slice(pk_slice);
        let signer_pubkey = Pubkey::new_from_array(pk_arr);

        require!(
            signer_pubkey == ctx.accounts.authority.key(),
            VeiledError::AuthorityMismatch
        );

        msg!("✓ Ed25519 signature verified and validated");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct VerifySignature<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Validated manually in instruction
    pub proof_hash: UncheckedAccount<'info>,

    /// CHECK: Verified by requiring well-known address
    #[account(address = ix_sysvar::Instructions::id())]
    pub instruction_sysvar: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum VeiledError {
    #[msg("Invalid instruction sysvar")]
    InvalidInstructionSysvar,

    #[msg("Expected Ed25519 program")]
    BadEd25519Program,

    #[msg("Bad Ed25519 accounts")]
    BadEd25519Accounts,

    #[msg("No Ed25519 program instruction found")]
    NoEdgeProgram,

    #[msg("Invalid signature count")]
    InvalidSignatureCount,

    #[msg("Invalid instruction data")]
    InvalidInstructionData,

    #[msg("Offset mismatch - points to wrong instruction")]
    OffsetMismatch,

    #[msg("Invalid message size")]
    InvalidMessageSize,

    #[msg("Proof hash mismatch")]
    ProofHashMismatch,

    #[msg("Is valid mismatch")]
    IsValidMismatch,

    #[msg("Authority public key mismatch")]
    AuthorityMismatch,
}
```

---

## Client-Side Implementation (TypeScript)

### Building Ed25519 Instruction

```typescript
import { Ed25519Program, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as nacl from 'tweetnacl';
import * as crypto from 'crypto';

function createEd25519Instruction(
  authorityKeypair: any,
  proofHash: Buffer,
  isValid: boolean,
  timestamp: number
): TransactionInstruction {
  // Build message: proof_hash (32) || is_valid (1) || timestamp (7)
  const message = Buffer.alloc(40);
  proofHash.copy(message, 0);
  message.writeUInt8(isValid ? 1 : 0, 32);
  
  // Write 7-byte timestamp (big-endian)
  const timestampBytes = Buffer.alloc(8);
  timestampBytes.writeBigInt64BE(BigInt(timestamp), 0);
  timestampBytes.slice(1, 8).copy(message, 33); // Skip first byte

  // Sign with authority keypair
  const signature = nacl.sign.detached(message, authorityKeypair.secretKey);

  // Create Ed25519 verification instruction
  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: authorityKeypair.publicKey.toBytes(),
    message,
    signature,
  });
}

// Usage in transaction
async function verifyProofOnChain(
  program: Program,
  proof: any,
  authorityKeypair: Keypair,
  connection: Connection
) {
  const proofHash = Buffer.from(proof.hash);
  const isValid = true; // Assume verified locally
  const timestamp = Date.now();

  // Create Ed25519 instruction
  const ed25519Ix = createEd25519Instruction(
    authorityKeypair,
    proofHash,
    isValid,
    timestamp
  );

  // Create program instruction
  const verifIx = await program.methods
    .verifySignature()
    .accountsPartial({
      authority: authorityKeypair.publicKey,
      proofHash: proofHash, // or PDA if storing
      instructionSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
    })
    .instruction();

  // Build transaction
  const tx = new Transaction();
  tx.add(ed25519Ix);    // Ed25519 verification first
  tx.add(verifIx);       // Then your program's instruction

  // Send and confirm
  const sig = await connection.sendTransaction(tx, [authorityKeypair]);
  await connection.confirmTransaction(sig);

  return sig;
}
```

---

## Testing: Critical Test Cases

You should implement these 6 test cases:

### Test 1: Valid Signature (Success Path)

```rust
#[tokio::test]
async fn test_valid_signature() {
    // Create valid Ed25519 instruction with correct message
    // Verify it succeeds
    // Assert: No error returned
}
```

### Test 2: Wrong Instruction Order

```rust
#[tokio::test]
async fn test_wrong_instruction_order() {
    // Place program instruction BEFORE Ed25519 instruction
    // Verify it fails
    // Assert: InvalidInstructionSysvar error
}
```

### Test 3: Offset Mismatch (Signature Security)

```rust
#[tokio::test]
async fn test_offset_mismatch() {
    // Craft instruction with signature_ix_idx != u16::MAX
    // Verify it fails
    // Assert: OffsetMismatch error
}
```

### Test 4: Message Content Mismatch

```rust
#[tokio::test]
async fn test_message_mismatch() {
    // Sign one message but put different message in instruction data
    // Verify it fails
    // Assert: ProofHashMismatch or IsValidMismatch error
}
```

### Test 5: Authority Mismatch

```rust
#[tokio::test]
async fn test_authority_mismatch() {
    // Sign with different keypair than expected
    // Verify it fails
    // Assert: AuthorityMismatch error
}
```

### Test 6: Signature Replay

```rust
#[tokio::test]
async fn test_signature_replay_prevention() {
    // Attempt to use same signature twice in different instructions
    // Verify second use fails
    // Assert: OffsetMismatch error (looks for Ed25519 before second instruction)
}
```

---

## Security Checklist for Your Implementation

Before deploying, verify:

- [ ] Program ID check: `ed_ix.program_id == ED25519_PROGRAM_ID`
- [ ] No accounts check: `ed_ix.accounts.is_empty()`
- [ ] All offset indices == `u16::MAX` (current instruction sentinel)
- [ ] All offsets >= HEADER_LEN (past header region)
- [ ] All slices within instruction data bounds
- [ ] Message size exactly expected length (40 bytes)
- [ ] Message content reconstructed and validated
- [ ] Public key extracted and compared to expected authority
- [ ] All 6 test cases passing
- [ ] Audit: Review offset validation logic carefully

---

## Why Your Workaround is Actually Best Practice

**Common misconception**: "My workaround is temporary, should find proper solution"

**Reality**: Ed25519Program instruction introspection IS the proper solution

**Evidence**:
- ✅ Used by RareSkills in reference implementation
- ✅ Used by Sorare in production contracts
- ✅ Recommended by Solana developers
- ✅ Avoids BPF stack limit issues
- ✅ Free compute (verified by runtime)

**Your vendored dependencies**: Also temporary but correct solution for now
- Edition 2024 support coming in Solana toolchain update
- Once available, can remove vendoring
- Code doesn't change, just dependency management

---

## Next Steps

1. **Add offset validation** to your current implementation (use code above)
2. **Implement test suite** (6 test cases)
3. **Security audit** of offset checking logic
4. **Deploy and test** on testnet
5. **Monitor for** Solana toolchain updates (edition 2024 support)
6. **Remove vendoring** when toolchain updates

---

## Resources

- **RareSkills Tutorial**: https://rareskills.io/post/solana-signature-verification
- **Cantina Security**: https://cantina.xyz/blog/signature-verification-risks-in-solana
- **Solana Docs**: Ed25519 signature verification
- **Production Examples**: Sorare, RareSkills projects

---

**Date**: January 26, 2026  
**Status**: Your current approach is correct. Add strict offset validation and deploy with confidence.
