# Verification Key Placeholder Status

**Date:** 2026-01-25  
**Status:** Placeholder VK created for MVP compilation

---

## Current Situation

The `getVerificationKey()` method in `@noir-lang/backend_barretenberg@0.36.0` causes a WebAssembly panic and is not supported. Alternative methods are also unavailable:

- ❌ JavaScript API: `getVerificationKey()` - WASM panic
- ❌ Nargo CLI: No direct VK generation command
- ❌ Proof generation: VK not exposed after proof generation

---

## Solution: Placeholder VK

A placeholder verification key file has been created to allow the Anchor program to compile:

**Location:** `packages/anchor/programs/veiled/src/verification_key.bin`

### What This Means

✅ **Works:**
- Anchor program compiles successfully
- Code structure is correct
- Integration can be tested

❌ **Doesn't Work:**
- Proof verification will fail (expected)
- Cannot verify actual ZK proofs on-chain

---

## For MVP Testing

This is acceptable for MVP because:

1. **Integration Testing:** We can test the full flow (proof generation → submission → on-chain handling)
2. **Code Structure:** All code paths are correct, just need real VK
3. **Documentation:** Clear path forward for post-MVP

---

## How to Generate Real VK (Post-MVP)

### Option 1: Wait for Backend Update
- Check if newer `@noir-lang/backend_barretenberg` version supports `getVerificationKey()`
- Update dependency and regenerate

### Option 2: Use Barretenberg CLI
- Install Barretenberg CLI (`bb`)
- Extract VK from circuit using CLI tools
- Convert to Arkworks format

### Option 3: Manual Extraction
- Generate proof in browser
- Inspect backend internals for VK
- Extract manually and convert

### Option 4: Use Different Backend
- Try `@aztec/bb.js` if it supports VK extraction
- Or use a different proving system

---

## Regenerating Placeholder

If you need to regenerate the placeholder:

```bash
./scripts/generate-vk-placeholder.sh
```

Or manually:

```bash
echo "PLACEHOLDER" > packages/anchor/programs/veiled/src/verification_key.bin
```

---

## Next Steps

1. ✅ Placeholder VK created
2. ✅ Anchor program compiles
3. ⏳ Test proof generation flow (will fail at verification, expected)
4. ⏳ Document VK extraction method once found
5. ⏳ Replace placeholder with real VK post-MVP

---

## References

- `docs/VK_EXTRACTION_WORKAROUND.md` - Alternative extraction methods
- `docs/groth16-vk-research.md` - VK format research
- `packages/anchor/programs/veiled/src/groth16.rs` - Verification code
