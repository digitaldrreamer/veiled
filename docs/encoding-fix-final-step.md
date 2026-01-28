# ⚡ ENCODING FIX - FINAL STEP TO 7/7 TESTS
## TypeScript/Rust Type Compatibility | January 26, 2026

---

## THE ISSUE (NOT Memory!)

Memory is fixed ✅

Now the problem is **type encoding mismatch**:
```
Rust: domain: [u8; 32]
TypeScript: domain: string or Vec
Result: Deserialization fails
```

---

## THE FIX (10 Minutes)

### Step 1: Find Domain Creation in Tests (2 min)

```bash
# Search for domain in test file
grep -n "domain" tests/ed25519_security.ts | head -20
```

You'll find something like:
```typescript
const domain = "veiled";  // ❌ String
```

### Step 2: Change to Fixed-Size Array (3 min)

**BEFORE:**
```typescript
const domain = "veiled";
```

**AFTER:**
```typescript
// Create fixed-size array
const domain = new Uint8Array(32);
// Copy "veiled" into first 7 bytes
const domainBytes = Buffer.from("veiled");
domain.set(domainBytes, 0);
// Rest stays zero-padded automatically
```

### Step 3: Verify Account Space (2 min)

Check that your account space matches the Rust layout:

```rust
// In program (verify these match)
let space = 8 +      // discriminator
            32 +     // domain [u8; 32]
            32 +     // proof_hash [u8; 32]
            8 +      // is_valid (bool)
            8;       // timestamp (i64)
```

```typescript
// In TypeScript test
const space = 8 + 32 + 32 + 8 + 8;  // Should match above
```

### Step 4: Run Tests (1 min)

```bash
cd packages/anchor
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/ed25519_security.ts
```

**Expected:**
```
7 passing ✅
```

---

## COMMON ENCODING ISSUES

### Issue: "Expected [u8; 32], got Vec"

**Fix:** Make sure you're passing fixed array, not dynamic:
```typescript
// ❌ Wrong - Vec
const domain = [1, 2, 3];  // This is a Vec

// ✅ Right - Fixed array
const domain = new Uint8Array(32);
```

### Issue: "Account space mismatch"

**Fix:** Calculate correctly:
```rust
// Rust calculation
let space = 8 + 32 + 32 + 8 + 8;  // 88 bytes total

// TypeScript must request same space
const space = 88;
```

### Issue: "Deserialization failed"

**Fix:** Ensure types match exactly:
```typescript
// If Rust has [u8; 32]
// TypeScript must pass Uint8Array(32), not string or number[]
```

---

## QUICK CHECKLIST

- [ ] Domain is `Uint8Array(32)` not `string`
- [ ] Domain is zero-padded if shorter than 32 bytes
- [ ] Account space calculation matches Rust
- [ ] All fixed arrays in Rust match TypeScript encoding
- [ ] No strings being passed where arrays expected
- [ ] Borsh serialization is consistent

---

## COMPLETE EXAMPLE

### Rust Program:
```rust
pub fn verify_auth(
    instruction_sysvar: &AccountInfo,
    domain: [u8; 32],  // Fixed array
) -> Result<()> {
    // ...
}

// Space calculation
let space = 8 + 32 + 32 + 8 + 8;
```

### TypeScript Test:
```typescript
// Create domain as fixed array
const domain = new Uint8Array(32);
const domainBytes = Buffer.from("veiled");
domain.set(domainBytes, 0);

// Create account with correct space
const [account] = await PublicKey.findProgramAddress(
    [Buffer.from("test"), domain],
    programId,
);

// Use domain in instruction
await program.methods
    .verifyAuth(domain)
    .accounts({
        // ... accounts
    })
    .rpc();
```

---

## TESTING AFTER FIX

```bash
# Quick test
cd packages/anchor

# Rebuild if needed
cargo build-sbf --manifest-path programs/veiled/Cargo.toml --bpf-out-dir programs/veiled/target/deploy

# Deploy if rebuilt
solana program deploy programs/veiled/target/deploy/veiled.so --url http://localhost:8899

# Run tests
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/ed25519_security.ts
```

---

## EXPECTED OUTPUT

```
✓ should reject when program instruction comes before Ed25519 instruction
✓ should reject when message content doesn't match signature
✓ should reject when signature is from different authority
✓ should reject invalid Ed25519 signature
✓ should reject expired verification results
✓ should accept valid Ed25519 signature
✓ should reject duplicate nullifier

7 passing (XXms)
```

---

## TIMELINE

| Step | Duration |
|------|----------|
| Find domain in code | 2 min |
| Change to Uint8Array(32) | 3 min |
| Verify space calculation | 2 min |
| Run tests | 1 min |
| **Total** | **8 minutes** |

---

## YOU'RE 10 MINUTES FROM DONE! 🏁

Memory is fixed ✅  
Encoding fix is simple ✅  
7/7 tests waiting ✅

Go get it! 🚀
