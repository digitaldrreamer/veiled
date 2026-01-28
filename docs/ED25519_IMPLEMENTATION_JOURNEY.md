# Ed25519 Verification Implementation Journey

**Date**: January 26, 2025  
**Last Updated**: January 26, 2026  
**Goal**: Implement on-chain Ed25519 signature verification in Rust for the Veiled Anchor program  
**Status**: ✅ **Research Complete** - Ed25519Program confirmed as best practice, security validations needed

---

## Table of Contents

1. [Original Goal](#original-goal)
2. [Issues Encountered](#issues-encountered)
3. [Attempts & Iterations](#attempts--iterations)
4. [Current State](#current-state)
5. [Research Findings](#research-findings) ⭐ **NEW**
6. [Security Requirements](#security-requirements) ⭐ **NEW**
7. [Recommendations](#recommendations)
8. [Implementation Guide](#implementation-guide) ⭐ **NEW**

---

## Original Goal

Implement **cryptographic Ed25519 signature verification** in the Anchor program to validate that the `verifier_signature` field in `VerificationResult` is a valid Ed25519 signature over the message `proof_hash || is_valid || timestamp`, signed by the `authority` public key.

**Why**: Defense-in-depth security - Anchor's `Signer` constraint validates the transaction signature, but we want to also cryptographically verify the `verifier_signature` field to ensure data integrity.

---

## Issues Encountered

### 1. **GLIBC Version Mismatch** (Host Environment)

**Problem**: 
- Host system has GLIBC 2.35
- Anchor CLI binary requires GLIBC 2.39
- Error: `/lib/x86_64-linux-gnu/libc.so.6: version 'GLIBC_2.39' not found`

**Impact**: Cannot run `anchor build` or `anchor deploy` locally

**Solution Attempted**: Use Docker (`solanafoundation/anchor:v0.32.1`)

---

### 2. **Rust Edition 2024 Incompatibility** (Dependency Chain)

**Problem**:
- Several crates (`constant_time_eq`, `blake3`) recently updated to `edition = "2024"`
- Solana BPF toolchain uses Cargo 1.84.0, which doesn't support `edition2024` feature
- Error: `feature 'edition2024' is required` but not stabilized

**Affected Crates**:
- `constant_time_eq v0.4.2` (dependency of `ed25519-compact`)
- `blake3 v1.8.3` (dependency of Solana SDK)

**Impact**: Cannot build program even in Docker

**Solution Attempted**: 
- Vendor older versions (`constant_time_eq v0.3.0`, `blake3 v1.8.2`)
- Patch vendored crates to use `edition = "2021"` instead of `"2024"`

**Status**: ✅ **Partially Fixed** - Vendoring works but requires manual maintenance

---

### 3. **Ed25519 Library BPF Compatibility**

**Problem**: 
- `ed25519-dalek` (v1.0, v2.0) not compatible with Solana BPF
- `ed25519-compact` (v1.0, v2.0) requires `edition2024` dependencies
- `ed25519-compact` v1.0 has **BPF stack overflow** issues:
  ```
  Error: Function _ZN15ed25519_compact12edwards255194GeP325from_bytes_negate_vartime17h8b27596da6dd5961E 
  Stack offset of 4856 exceeded max offset of 4096 by 760 bytes
  ```

**Impact**: Cannot use standard Ed25519 libraries in BPF programs

**Solution Attempted**: 
- Tried `solana-program-ed25519-dalek-bump` - API mismatch, couldn't find correct imports
- Tried `ed25519-compact` v0.3 - version doesn't exist
- Switched to **Solana's native Ed25519Program** (instruction introspection)

**Status**: ⚠️ **Workaround Implemented** - Using Ed25519Program instead of direct crypto

---

### 4. **Missing Solana Program Modules**

**Problem**:
- `anchor_lang::solana_program::ed25519_program` doesn't exist
- `solana_program::ed25519_program` module not available in Anchor's re-export

**Impact**: Cannot import Ed25519Program constants/types

**Solution Attempted**: 
- Hardcode Ed25519 program ID: `Ed25519SigVerify111111111111111111111111111`
- Use `anchor_lang::solana_program::sysvar::instructions` for instruction introspection

**Status**: ✅ **Workaround Implemented** - Hardcoded program ID

---

### 5. **Anchor IDL Build Feature**

**Problem**:
- Anchor 0.32.1 requires `idl-build` feature to generate IDL
- Error: `idl-build feature is missing`

**Impact**: Build fails after fixing other issues

**Solution**: Added to `Cargo.toml`:
```toml
[features]
idl-build = ["anchor-lang/idl-build", "anchor-spl/idl-build"]
```

**Status**: ✅ **Fixed**

---

## Attempts & Iterations

### Attempt 1: `ed25519-dalek` v2.0
- **Result**: ❌ Incompatible with BPF (curve25519-dalek dependency issues)
- **Error**: Multiple compilation errors, missing types

### Attempt 2: `ed25519-dalek` v1.0
- **Result**: ❌ Same BPF incompatibility issues
- **Error**: `curve25519-dalek` not compatible with Solana BPF environment

### Attempt 3: `ed25519-compact` v2.0
- **Result**: ❌ Requires `edition2024` dependencies
- **Error**: `constant_time_eq v0.4.2` requires Rust edition 2024

### Attempt 4: `ed25519-compact` v1.0
- **Result**: ❌ BPF stack overflow + `edition2024` dependencies
- **Error**: Stack offset exceeded (4856 > 4096 bytes)

### Attempt 5: `ed25519-compact` v0.3
- **Result**: ❌ Version doesn't exist on crates.io
- **Error**: `failed to select a version`

### Attempt 6: `solana-program-ed25519-dalek-bump` v1.16
- **Result**: ❌ API mismatch, couldn't find correct imports
- **Error**: `unresolved imports 'solana_program_ed25519_dalek_bump::PublicKey'`

### Attempt 7: Vendor + Patch `constant_time_eq` and `blake3`
- **Result**: ⚠️ Partial success - build works but requires manual maintenance
- **Approach**: 
  - Downloaded `constant_time_eq v0.4.2` and `blake3 v1.8.3` from crates.io
  - Patched `Cargo.toml` files to use `edition = "2021"` instead of `"2024"`
  - Added to `[patch.crates-io]` in Anchor's `Cargo.toml`
- **Status**: Build succeeds but fragile

### Attempt 8: Solana's Ed25519Program (Current)
- **Result**: ✅ **Confirmed as Best Practice** (not a workaround!)
- **Approach**: 
  - Client adds Ed25519 verification instruction to transaction
  - Program reads `sysvar::instructions` to find Ed25519 instruction
  - Validates that instruction exists and matches expected message/pubkey
- **Status**: ✅ Builds and deploys, but **needs strict offset validation** for security
- **Research Finding**: This is the industry-standard approach used by RareSkills, Sorare, and Solana teams

---

## Current State

### ✅ What Works

1. **Docker Build**: Program builds successfully in `solanafoundation/anchor:v0.32.1`
2. **BPF Compilation**: No stack overflow errors
3. **IDL Generation**: IDL builds correctly
4. **Deployment Artifacts**: `.so` file generated at `programs/veiled/target/deploy/veiled.so`

### ⚠️ Current Implementation (Needs Security Hardening)

**File**: `packages/anchor/programs/veiled/src/ultrahonk.rs`

**Approach**: Ed25519Program Instruction Introspection ✅ **Correct Approach**
- Hardcoded Ed25519 program ID (acceptable - program ID is constant)
- Reads `sysvar::instructions` to find Ed25519 verification instruction
- Validates instruction exists and matches expected message/signature/pubkey
- **Security Gap**: Missing strict offset validation (see [Security Requirements](#security-requirements))
- **Client Requirement**: Client must add Ed25519 instruction to transaction (standard pattern)

**File**: `packages/anchor/programs/veiled/Cargo.toml`

**Vendored Dependencies**:
```toml
[patch.crates-io]
constant_time_eq = { path = "../vendor/constant_time_eq" }
blake3 = { path = "../vendor/blake3" }
```

**Manual Patches Required**:
- `packages/anchor/vendor/constant_time_eq/Cargo.toml`: Changed `edition = "2024"` → `"2021"`
- `packages/anchor/vendor/blake3/Cargo.toml`: Changed `edition = "2024"` → `"2021"`

### ⚠️ What Needs Improvement

1. **Security Validations**: Current implementation lacks strict offset validation
   - Missing check that all offset indices == `u16::MAX` (current instruction sentinel)
   - Missing strict bounds checking on all slices
   - Missing message content reconstruction and validation
   - **Risk**: Signature forgery attacks possible without these checks

2. **Dependency Management**: Vendoring requires manual updates when dependencies change
   - **Temporary**: Will be resolved when Solana toolchain supports `edition2024`
   - **Acceptable**: Current approach is correct workaround

3. **Client Integration**: Requires client to construct Ed25519 instruction
   - **Standard Pattern**: This is how all production Solana programs do it
   - **SDK Support**: Already implemented in `packages/core/src/solana/program.ts`

---

## Research Findings ⭐

**Research Completed**: January 26, 2026  
**Key Documents**: `ed25519-implementation.md`, `complete-summary.md`

### 1. **Ed25519Program is the Right Choice** ✅

**Finding**: Ed25519Program instruction introspection is **NOT a workaround** - it's the industry-standard approach.

**Evidence**:
- ✅ Used by RareSkills in reference implementation
- ✅ Used by Sorare in production DeFi protocol
- ✅ Recommended by Solana official documentation
- ✅ Used by Solana core team in production programs

**Why Other Approaches Don't Work**:
- **Direct Ed25519 Crypto in BPF**: Stack overflow (4856 bytes > 4096 byte limit)
- **ed25519-dalek**: BPF incompatible (curve25519-dalek dependency issues)
- **ed25519-compact**: Requires `edition2024` dependencies (toolchain doesn't support yet)

**Conclusion**: Ed25519Program is the **only viable approach** for Solana BPF programs.

### 2. **Critical Security Requirement: Offset Validation** ⚠️

**Finding**: Current implementation is **vulnerable to signature forgery attacks** without strict offset validation.

**Vulnerability** (from Cantina audit firm):
> "Offset-based signature validation issues continue to surface across Solana-based protocols. These are not isolated bugs but structural implementation risks requiring explicit validation to eliminate."

**Attack Vector**:
```
Attacker sends transaction with:
  Ed25519Program verifies signature over: [recipient=attacker, amount=1000000]
  Your program reads from offset 0 expecting: [recipient=user, amount=1]
  
Result: Attacker signature gets applied to user's transaction
```

**Required Security Checks**:
1. ✅ All offset indices MUST == `u16::MAX` (signals "current instruction")
2. ✅ Bounds-check every slice before reading
3. ✅ Reconstruct and validate message content (don't trust offsets blindly)
4. ✅ Validate public key matches expected authority

**Current Implementation Gap**: 
- Lines 206-212 in `ultrahonk.rs` allow `ix_index OR u16::MAX`
- **Should only allow `u16::MAX`** for current instruction
- Missing strict message content validation
- Missing authority validation

### 3. **Dependency Management Strategy** ✅

**Finding**: Vendoring is the correct temporary solution.

**Status**:
- ✅ Vendored `constant_time_eq` and `blake3` with `edition = "2021"` patches
- ✅ Build succeeds consistently
- ⏳ Will be unnecessary when Solana toolchain supports `edition2024`
- 📅 Monitor Solana toolchain updates

**Conclusion**: Current approach is correct. No changes needed until toolchain updates.

### 4. **Client Integration** ✅

**Finding**: Client-side Ed25519 instruction construction is standard and already implemented.

**Status**:
- ✅ SDK already constructs Ed25519 instruction (`packages/core/src/solana/program.ts`)
- ✅ Uses `Ed25519Program.createInstructionWithPublicKey()` (standard API)
- ✅ Instruction added as `preInstruction` to transaction (correct order)

**Conclusion**: Client integration is complete and follows best practices.

---

## Security Requirements ⚠️

**Priority**: **CRITICAL** - Must be implemented before production deployment

### Required Security Validations

Based on research and audit findings, the following 7 security checks must be implemented:

1. **Program ID Validation**: Verify Ed25519 instruction is from correct program
2. **No Accounts Check**: Ed25519Program is stateless (no accounts)
3. **Offset Index Validation**: All offsets MUST == `u16::MAX` (current instruction sentinel)
4. **Bounds Checking**: All slices must be within instruction data bounds
5. **Message Size Validation**: Message must be exactly expected length (40 bytes)
6. **Message Content Validation**: Reconstruct and validate message matches expectations
7. **Authority Validation**: Public key must match expected authority

### Current Implementation Status

**File**: `packages/anchor/programs/veiled/src/ultrahonk.rs`

**Lines 206-212** (Current - Insecure):
```rust
let current_marker = u16::MAX;
let ix_ref_ok = |v: u16| v == ix_index || v == current_marker;

if !ix_ref_ok(signature_ix) || !ix_ref_ok(public_key_ix) || !ix_ref_ok(message_ix) {
    continue;
}
```

**Problem**: Allows `ix_index OR u16::MAX`, but should **ONLY allow `u16::MAX`**

**Required Fix**: Change to strict validation:
```rust
require!(
    signature_ix == u16::MAX
        && public_key_ix == u16::MAX
        && message_ix == u16::MAX,
    VeiledError::OffsetMismatch
);
```

**Missing Validations**:
- ❌ Message content reconstruction and validation
- ❌ Authority public key validation
- ❌ Strict bounds checking on all slices

See `ed25519-implementation.md` for complete secure implementation.

---

## Recommendations

### Immediate (Critical - Before Production)

1. **Add Strict Offset Validation**: Implement 7 security checks from `ed25519-implementation.md`
2. **Implement Test Suite**: Create 6 security test cases (see Testing section below)
3. **Security Audit**: Review offset validation logic carefully
4. **Deploy to Testnet**: Test thoroughly before mainnet deployment

**Timeline**: 2-3 days focused work

### Short-Term (Maintenance)

1. **Monitor Toolchain Updates**: Watch for Solana BPF toolchain support for `edition2024`
2. **Document Security Model**: Document why Ed25519Program is used and security considerations
3. **Keep Vendored Dependencies**: Continue using vendored crates until toolchain updates

### Long-Term (Optimization)

1. **Remove Vendoring**: Once Solana toolchain supports `edition2024`, remove vendored dependencies
2. **Consider SDK Improvements**: Evaluate if Ed25519 instruction construction can be further simplified
3. **Performance Monitoring**: Monitor Ed25519Program verification performance in production

---

## Files Modified

### Rust (Anchor Program)
- `packages/anchor/programs/veiled/Cargo.toml` - Added vendored dependencies, `idl-build` feature
- `packages/anchor/programs/veiled/src/ultrahonk.rs` - Switched to Ed25519Program introspection
- `packages/anchor/programs/veiled/src/lib.rs` - Added `instructions_sysvar` account

### Vendored Dependencies (Manual Patches)
- `packages/anchor/vendor/constant_time_eq/Cargo.toml` - Patched edition
- `packages/anchor/vendor/blake3/Cargo.toml` - Patched edition

### TypeScript (SDK)
- `packages/core/src/solana/program.ts` - Updated to add Ed25519 instruction to transaction
- `packages/core/src/veiled-auth.ts` - Updated to construct Ed25519 instruction

---

---

## Implementation Guide ⭐

**Complete Implementation**: See `ed25519-implementation.md` for full secure implementation

### Quick Reference: Required Changes

**File**: `packages/anchor/programs/veiled/src/ultrahonk.rs`

**Change 1**: Strict Offset Validation (Lines 206-212)
```rust
// OLD (Insecure):
let ix_ref_ok = |v: u16| v == ix_index || v == current_marker;

// NEW (Secure):
require!(
    signature_ix == u16::MAX
        && public_key_ix == u16::MAX
        && message_ix == u16::MAX,
    VeiledError::OffsetMismatch
);
```

**Change 2**: Add Message Content Validation
```rust
// Extract and validate message content
let msg_slice = &data[message_offset..message_offset + message_size];
require!(message_size == 40, VeiledError::InvalidMessageSize);

let proof_hash = &msg_slice[0..32];
let is_valid_byte = msg_slice[32];
// Validate against expected values...
```

**Change 3**: Add Authority Validation
```rust
let pk_slice = &data[public_key_offset..public_key_offset + 32];
let signer_pubkey = Pubkey::new_from_array(/* ... */);
require!(
    signer_pubkey == expected_pubkey,
    VeiledError::AuthorityMismatch
);
```

**Change 4**: Add Error Variants
```rust
#[error_code]
pub enum VeiledError {
    // ... existing errors ...
    #[msg("Offset mismatch - points to wrong instruction")]
    OffsetMismatch,
    #[msg("Invalid message size")]
    InvalidMessageSize,
    #[msg("Authority public key mismatch")]
    AuthorityMismatch,
}
```

### Testing Requirements

Implement these 6 critical test cases:

1. **Valid Signature**: Success path with correct Ed25519 instruction
2. **Wrong Instruction Order**: Program instruction before Ed25519 instruction
3. **Offset Mismatch**: Instruction with `signature_ix_idx != u16::MAX`
4. **Message Content Mismatch**: Signature over different message than expected
5. **Authority Mismatch**: Signature from different keypair than expected
6. **Signature Replay**: Attempt to reuse signature in different instruction

See `ed25519-implementation.md` for complete test implementations.

---

## Next Steps

### Phase 1: Security Hardening (2-3 days)

1. ✅ **Research Complete**: Ed25519Program confirmed as best practice
2. ⏳ **Add Security Validations**: Implement 7 security checks
3. ⏳ **Implement Test Suite**: Create 6 security test cases
4. ⏳ **Security Review**: Audit offset validation logic
5. ⏳ **Testnet Deployment**: Deploy and test thoroughly

### Phase 2: Production Readiness

1. ⏳ **Mainnet Deployment**: Deploy after testnet validation
2. ⏳ **Monitor Performance**: Track Ed25519Program verification performance
3. ⏳ **Documentation**: Update docs with security model

### Phase 3: Long-Term Maintenance

1. ⏳ **Monitor Toolchain**: Watch for `edition2024` support
2. ⏳ **Remove Vendoring**: Once toolchain updates, remove vendored dependencies
3. ⏳ **Optimize**: Consider performance improvements if needed

---

## Key Learnings

1. **Ed25519Program is Best Practice**: Not a workaround - it's the industry-standard approach
2. **BPF Stack Limits**: Solana BPF has strict 4096-byte stack limit, which rules out direct crypto
3. **Offset Validation is Critical**: Without strict validation, signature forgery attacks are possible
4. **Edition 2024**: Many Rust crates are moving to `edition2024`, but Solana toolchain doesn't support it yet (vendoring is correct workaround)
5. **Docker is Essential**: For consistent builds across different host environments
6. **Research Confirms Approach**: Ed25519Program is used by RareSkills, Sorare, and Solana teams
7. **Security First**: Always validate offsets strictly - `u16::MAX` only, never allow `ix_index`

---

## Related Documents

- **`ed25519-implementation.md`**: Complete secure implementation guide with 7 security checks
- **`complete-summary.md`**: Overview of both UltraHonk and Ed25519 challenges
- **`ED25519_VERIFICATION_ANALYSIS.md`**: Detailed analysis of verification approaches

---

**Last Updated**: January 26, 2026  
**Status**: ✅ **Research Complete** - Implementation ready, security validations needed  
**Next Action**: Implement 7 security checks from `ed25519-implementation.md`
