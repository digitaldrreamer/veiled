# TODOs and Placeholders - Complete List

**Date**: January 26, 2026  
**Status**: Post-MVP Implementation Items

---

## 🔴 CRITICAL SECURITY ISSUES (Must Fix Before Production)

### 1. **Fallback Proof Validation** ⚠️ SECURITY RISK
**File**: `packages/core/src/proof/generator.ts:454-458`

```typescript
// * Last resort: If we have public inputs, we can reconstruct and verify
// * For now, return true if proof structure looks valid (basic check)
// * In production, this should always use proper verification
if (proof.length > 0) {
  console.warn('⚠️  Using basic proof validation (not cryptographically secure)');
  return true; // * Basic validation - should be replaced with proper verification
}
```

**Issue**: Returns `true` for any non-empty proof if verification fails  
**Risk**: Invalid proofs could be accepted  
**Fix**: Remove fallback, always return `false` if verification fails  
**Priority**: 🔴 CRITICAL

---

### 2. **Placeholder Signature** ⚠️ SECURITY RISK
**File**: `packages/core/src/veiled-auth.ts:97`

```typescript
const placeholderSignature = new Uint8Array(64); // * Will be validated by Anchor's Signer
```

**Issue**: Uses all-zero signature (64 bytes of zeros)  
**Risk**: Signature field is not cryptographically validated  
**Current Mitigation**: Anchor's `Signer` constraint validates transaction signature  
**Fix**: Sign the verification result message itself  
**Priority**: 🟡 MEDIUM (Anchor signer provides security, but should enhance)

---

### 3. **Basic Signature Validation** ⚠️ SECURITY RISK
**File**: `packages/anchor/programs/veiled/src/ultrahonk.rs:88`

```rust
// * Verify Ed25519 signature
// * Solana uses Ed25519 for all signatures
// * The signature is already validated by Anchor if the account is a Signer
// * Here we just ensure the signature is non-zero (basic check)
// * In production, you might want additional validation

require!(
    self.verifier_signature != [0u8; 64],
    VeiledError::InvalidProof
);
```

**Issue**: Only checks signature is non-zero, doesn't verify cryptographically  
**Risk**: Any non-zero signature passes validation  
**Current Mitigation**: Anchor's `Signer` constraint validates transaction  
**Fix**: Implement proper Ed25519 signature verification  
**Priority**: 🟡 MEDIUM (Anchor signer provides security, but should enhance)

---

## 🟡 POST-MVP FEATURES (Can Defer)

### 4. **Session Expiry**
**File**: `packages/anchor/programs/veiled/src/lib.rs:118`

```rust
// TODO: Add expiry, commitment, etc. (post-MVP)
```

**File**: `packages/core/src/veiled-auth.ts:142-143`

```typescript
// * TODO: Check expiry timestamp from account data
// * For now, if account exists, session is valid
```

**File**: `packages/core/src/veiled-auth.ts:155`

```typescript
// TODO: Support session expiry / revocation where applicable.
```

**Status**: Post-MVP feature  
**Priority**: 🟢 LOW

---

### 5. **Circuit Signature Verification**
**File**: `packages/core/src/veiled-auth.ts:58`

```typescript
// TODO: Update circuit to verify signature directly instead of using secret key
```

**File**: `packages/core/src/wallet/adapter.ts:67`

```typescript
// For now, return first 32 bytes of signature as placeholder
return signature.slice(0, 32);
```

**Status**: Architecture improvement  
**Priority**: 🟢 LOW

---

## 🟢 ARCHITECTURE TODOS (Non-Critical)

### 6. **Wallet Adapter Integration**
**File**: `packages/core/src/wallet/adapter.ts:4-5`

```typescript
// * TODO: Integrate with @solana/wallet-adapter-base
// * For now, this defines the interface
```

**Status**: Already integrated via `solana-adapter.ts`  
**Priority**: 🟢 LOW (can remove TODO)

---

### 7. **VK Export Limitations**
**File**: `packages/core/src/proof/generator.ts:131`

```typescript
// * For now, throw an error explaining the limitation
```

**File**: `packages/core/src/proof/vk-exporter.ts:24`

```typescript
// * For now, return error - binary conversion needs backend-specific logic
```

**Status**: VK extraction works via browser/nargo CLI  
**Priority**: 🟢 LOW

---

### 8. **Type Placeholders**
**File**: `packages/core/src/types.ts:37-41`

```typescript
/** Placeholder until Noir + Anchor plumbing is implemented */
```

**Status**: Already implemented  
**Priority**: 🟢 LOW (can remove)

---

## 📋 Summary by Priority

### 🔴 Must Fix Before Production

1. **Remove fallback proof validation** (`generator.ts:458`)
   - Currently returns `true` for any proof if verification fails
   - Should return `false` and throw error instead

2. **Implement proper signature validation** (optional enhancement)
   - Currently uses placeholder signature
   - Anchor's signer provides security, but could enhance

### 🟡 Should Fix for Production

3. **Proper Ed25519 signature verification** (`ultrahonk.rs:88`)
   - Currently only checks non-zero
   - Should verify signature cryptographically

### 🟢 Can Defer (Post-MVP)

4. Session expiry support
5. Circuit signature verification
6. Clean up completed TODOs

---

## 🔧 Recommended Fixes

### Fix 1: Remove Fallback Validation

```typescript
// packages/core/src/proof/generator.ts:454-462

// REMOVE THIS:
if (proof.length > 0) {
  console.warn('⚠️  Using basic proof validation (not cryptographically secure)');
  return true; // * Basic validation - should be replaced with proper verification
}

// REPLACE WITH:
throw new Error(
  `Proof verification failed: ${bbError instanceof Error ? bbError.message : String(bbError)}. ` +
  `Make sure @aztec/bb.js is properly installed and the proof format is correct.`
);
```

### Fix 2: Proper Signature Validation (Optional)

```rust
// packages/anchor/programs/veiled/src/ultrahonk.rs:88

// ADD proper Ed25519 verification:
use solana_program::ed25519_program;

pub fn validate_signature(&self, verifier_pubkey: &Pubkey) -> Result<()> {
    // Reconstruct message
    let mut message = Vec::with_capacity(41);
    message.extend_from_slice(&self.proof_hash);
    message.push(if self.is_valid { 1 } else { 0 });
    message.extend_from_slice(&self.timestamp.to_le_bytes());
    
    // Verify Ed25519 signature
    // Note: This requires the signature to be in the instruction data
    // For now, Anchor's Signer constraint is sufficient
    // This can be enhanced if needed
    
    require!(
        self.verifier_signature != [0u8; 64],
        VeiledError::InvalidProof
    );
    
    Ok(())
}
```

---

## ✅ Already Handled

- ✅ WASM verification implemented
- ✅ Verification result storage implemented
- ✅ Nullifier replay protection implemented
- ✅ Anchor signer validation (provides security)

---

## Next Actions

1. **Immediate**: Fix fallback validation (remove `return true`)
2. **Before Production**: Enhance signature validation
3. **Post-MVP**: Add session expiry, circuit improvements

---

**Current Status**: MVP-ready with known security considerations. The fallback validation is the only critical issue that must be fixed before production use.
