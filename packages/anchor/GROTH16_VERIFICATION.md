# Groth16 Verification Implementation Guide

**Status:** Placeholder structure created, actual verification pending  
**Priority:** CRITICAL - Security blocker  
**Estimated Time:** 1-2 days

---

## Current Status

✅ **Completed:**
- Proof parsing structure (`Groth16Proof::from_bytes()`)
- Module structure (`packages/anchor/programs/veiled/src/groth16.rs`)
- Integration point in `verify_auth` instruction
- Error handling structure

⏳ **Pending:**
- Actual Groth16 verification implementation
- Verification key generation from Noir circuit
- Library integration (groth16-solana or arkworks)

---

## Implementation Steps

### Step 1: Generate Verification Key from Noir Circuit

```bash
cd packages/circuit
nargo compile
# This generates target/veiled_circuit.json with verification key
```

**Note:** Noir 1.0+ may require different commands. Check `nargo --help` for verification key generation.

### Step 2: Choose Groth16 Verification Library

**Option A: groth16-solana (if available)**
```toml
[dependencies]
groth16-solana = "0.1.0"  # Check crate.io for actual version
```

**Option B: arkworks-groth16**
```toml
[dependencies]
ark-groth16 = "0.4"
ark-bn254 = "0.4"
ark-ec = "0.4"
ark-ff = "0.4"
```

**Option C: bellman (if compatible with Solana)**
```toml
[dependencies]
bellman = "0.1"
```

### Step 3: Implement Verification Function

Update `packages/anchor/programs/veiled/src/groth16.rs`:

```rust
pub fn verify_groth16_proof(
    proof: &Groth16Proof,
    public_inputs: &[u8],
    verification_key: &[u8],
) -> Result<()> {
    // Parse public inputs (3 fields: walletPubkeyHash, domainHash, nullifier)
    // Each is a Field (32 bytes)
    require!(public_inputs.len() >= 96, VeiledError::InvalidPublicInputs);
    
    // Use chosen library to verify
    // Example with arkworks:
    // let vk = VerifyingKey::deserialize(verification_key)?;
    // let proof_parsed = Proof::deserialize(&proof_bytes)?;
    // vk.verify(&proof_parsed, &public_inputs)?;
    
    Ok(())
}
```

### Step 4: Load Verification Key

**Option A: Compile-time constant**
```rust
const VERIFICATION_KEY: &[u8] = include_bytes!("../verification_key.bin");
```

**Option B: On-chain account (for updates)**
```rust
#[account]
pub struct VerificationKeyAccount {
    pub key: Vec<u8>,
    pub version: u8,
}
```

**Option C: Instruction parameter (for flexibility)**
```rust
pub fn verify_auth(
    ctx: Context<VerifyAuth>,
    proof: Vec<u8>,
    public_inputs: Vec<u8>,
    verification_key: Vec<u8>,  // Pass as parameter
    nullifier: [u8; 32],
    domain: String,
) -> Result<()> {
    // ...
}
```

---

## Proof Format

**Groth16 Proof Structure:**
- **A** (G₁ point): 64 bytes (compressed) or 96 bytes (uncompressed)
- **B** (G₂ point): 128 bytes (compressed) or 192 bytes (uncompressed)
- **C** (G₁ point): 64 bytes (compressed) or 96 bytes (uncompressed)

**Total:** 256 bytes (compressed) or 384 bytes (uncompressed)

**Public Inputs:**
- `walletPubkeyHash`: Field (32 bytes)
- `domainHash`: Field (32 bytes)
- `nullifier`: Field (32 bytes)
- **Total:** 96 bytes

---

## Compute Unit Considerations

Groth16 verification on Solana:
- **Expected CU:** 100,000 - 200,000 compute units
- **Transaction limit:** 1,400,000 CU
- **Should fit:** ✅ Yes, well within limits

---

## Testing

1. Generate proof using Noir circuit
2. Serialize proof to bytes
3. Call `verify_auth` instruction
4. Verify transaction succeeds
5. Test with invalid proof (should fail)
6. Test with reused nullifier (should fail)

---

## Resources

- **Groth16 Paper:** https://eprint.iacr.org/2016/260.pdf
- **Noir Documentation:** https://noir-lang.org/docs/
- **Solana Compute Limits:** https://docs.solana.com/developing/programming-model/runtime#compute-budget
- **Arkworks:** https://github.com/arkworks-rs
- **Bellman:** https://github.com/zkcrypto/bellman

---

## Security Notes

⚠️ **CRITICAL:** Do not deploy to mainnet without real Groth16 verification.

The current placeholder accepts all proofs, which means:
- Anyone can submit fake proofs
- No cryptographic security
- System is completely insecure

**This is only acceptable for:**
- Local development
- Testing infrastructure
- Demo purposes (with clear warnings)

**Must implement before:**
- Any production deployment
- Mainnet deployment
- Real user testing with funds
