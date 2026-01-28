# TODO Difficulty Assessment

**Date**: January 26, 2026

---

## 🟢 EASY (30 min - 1 hour)

### 1. **Session Expiry Support** ⭐ Easiest

**What needs to be done:**
- Add `expires_at: i64` field to `NullifierAccount` struct
- Set expiry timestamp when creating account
- Check expiry in `verifySession()` function

**Files to modify:**
- `packages/anchor/programs/veiled/src/lib.rs` (add field, set value)
- `packages/core/src/veiled-auth.ts` (check expiry)

**Code changes:**
```rust
// lib.rs - Add field
pub struct NullifierAccount {
    pub nullifier: [u8; 32],
    pub domain: String,
    pub created_at: i64,
    pub expires_at: i64,  // * Add this
}

// lib.rs - Set expiry (e.g., 30 days)
nullifier_account.expires_at = Clock::get()?.unix_timestamp + (30 * 24 * 60 * 60);
```

```typescript
// veiled-auth.ts - Check expiry
const account = await program.account.nullifierAccount.fetch(nullifierPda);
const now = Math.floor(Date.now() / 1000);
if (account.expiresAt < now) {
  return { valid: false };
}
```

**Difficulty**: ⭐ Very Easy  
**Time**: 30 minutes  
**Risk**: Low (straightforward addition)

---

### 2. **Sign Verification Result** ⭐ Easy

**What needs to be done:**
- Sign the verification result message (proof_hash + is_valid + timestamp)
- Replace placeholder signature with actual signature

**Files to modify:**
- `packages/core/src/veiled-auth.ts` (sign message)
- `packages/core/src/proof/generator.ts` (update createVerificationResult)

**Code changes:**
```typescript
// veiled-auth.ts - Sign verification result
const messageToSign = new Uint8Array(41);
messageToSign.set(proofHash, 0);
messageToSign[32] = isValid ? 1 : 0;
messageToSign.set(timestampBytes, 33);

const signature = await this.walletAdapter.signMessage(messageToSign);
const verificationResult = await createVerificationResult(
  proofResult.proof,
  isValid,
  signature  // * Use real signature instead of placeholder
);
```

**Difficulty**: ⭐ Easy  
**Time**: 1 hour  
**Risk**: Low (just need to call signMessage)

---

## 🟡 MEDIUM (2-3 hours)

### 3. **Ed25519 Signature Verification in Rust** ⭐⭐ Medium

**What needs to be done:**
- Add Ed25519 verification library (e.g., `ed25519-dalek`)
- Implement proper signature verification in `validate_signature()`

**Files to modify:**
- `packages/anchor/programs/veiled/Cargo.toml` (add dependency)
- `packages/anchor/programs/veiled/src/ultrahonk.rs` (implement verification)

**Code changes:**
```toml
# Cargo.toml
[dependencies]
ed25519-dalek = { version = "2.0", features = ["std"] }
```

```rust
// ultrahonk.rs
use ed25519_dalek::{Verifier, VerifyingKey, Signature};

pub fn validate_signature(&self, verifier_pubkey: &Pubkey) -> Result<()> {
    // Reconstruct message
    let mut message = Vec::with_capacity(41);
    message.extend_from_slice(&self.proof_hash);
    message.push(if self.is_valid { 1 } else { 0 });
    message.extend_from_slice(&self.timestamp.to_le_bytes());
    
    // Convert Solana Pubkey to Ed25519 VerifyingKey
    let verifying_key = VerifyingKey::from_bytes(verifier_pubkey.as_ref())
        .map_err(|_| VeiledError::InvalidProof)?;
    
    // Convert signature bytes to Signature
    let signature = Signature::from_bytes(&self.verifier_signature)
        .map_err(|_| VeiledError::InvalidProof)?;
    
    // Verify signature
    verifying_key.verify(&message, &signature)
        .map_err(|_| VeiledError::InvalidProof)?;
    
    Ok(())
}
```

**Difficulty**: ⭐⭐ Medium  
**Time**: 2-3 hours  
**Risk**: Medium (need to handle Solana Pubkey format conversion)  
**Note**: Anchor's Signer already validates transaction signature, so this is optional enhancement

---

## 🔴 HARD (4-8 hours, may not be possible)

### 4. **Circuit Signature Verification** ⭐⭐⭐ Hard

**What needs to be done:**
- Update Noir circuit to verify Ed25519 signatures directly
- Remove secret key extraction from signature
- Use signature verification in circuit instead

**Files to modify:**
- `packages/circuit/src/main.nr` (major rewrite)
- `packages/core/src/wallet/adapter.ts` (remove secret key extraction)
- `packages/core/src/veiled-auth.ts` (update flow)

**Challenges:**
1. **Noir may not have Ed25519 verification** in std library
2. **Would need custom implementation** of Ed25519 in Noir
3. **Circuit complexity increases** significantly
4. **May require circuit redesign**

**Code changes (if possible):**
```noir
// main.nr - Hypothetical
use std::ed25519;

fn main(
    signature: [u8; 64],
    message: [u8; 32],
    wallet_pubkey: [u8; 32],
    // ... other inputs
) {
    // Verify signature
    assert(ed25519::verify(signature, message, wallet_pubkey));
    
    // Rest of circuit logic
}
```

**Difficulty**: ⭐⭐⭐ Very Hard  
**Time**: 4-8 hours (if possible)  
**Risk**: High (may not be feasible with current Noir capabilities)  
**Recommendation**: Defer until Noir std library supports Ed25519

---

## 📊 Summary

| TODO | Difficulty | Time | Risk | Priority |
|------|-----------|------|------|----------|
| Session Expiry | ⭐ Easy | 30 min | Low | 🟢 Low |
| Sign Verification Result | ⭐ Easy | 1 hour | Low | 🟡 Medium |
| Ed25519 Verification (Rust) | ⭐⭐ Medium | 2-3 hours | Medium | 🟡 Medium |
| Circuit Signature Verification | ⭐⭐⭐ Hard | 4-8 hours | High | 🔴 Low (defer) |

---

## 🎯 Recommended Order

### Phase 1: Quick Wins (1.5 hours)
1. ✅ **Session Expiry** - 30 min
2. ✅ **Sign Verification Result** - 1 hour

### Phase 2: Enhancements (2-3 hours)
3. ⚠️ **Ed25519 Verification** - Optional, Anchor signer already provides security

### Phase 3: Future (4-8 hours)
4. ❌ **Circuit Signature Verification** - Defer until Noir supports it

---

## 💡 My Recommendation

**Do Now (1.5 hours):**
- Session Expiry ✅
- Sign Verification Result ✅

**Consider Later:**
- Ed25519 Verification (nice to have, but Anchor signer is sufficient)

**Don't Do:**
- Circuit Signature Verification (wait for Noir std library support)

---

**Bottom Line**: The easy ones are **very easy** (1.5 hours total). The medium one is optional. The hard one should be deferred.
