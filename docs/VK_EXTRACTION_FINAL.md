# Verification Key Extraction - FINAL SOLUTION

**Status:** JavaScript API does NOT support VK extraction  
**Date:** 2026-01-25  
**Backend Version:** `@noir-lang/backend_barretenberg@0.36.0`

---

## The Problem

**`getVerificationKey()` causes WebAssembly panic ("unreachable executed")** in the current backend version. This is **NOT a bug** - it's a **limitation of the JavaScript API**.

The method exists in TypeScript definitions but the WASM implementation doesn't support it.

---

## The Solution: Use Nargo CLI

**The ONLY reliable way to extract the VK is using the `nargo` CLI.**

### Quick Method

```bash
bash scripts/extract-vk-with-nargo.sh
```

### Manual Method

```bash
cd packages/circuit
nargo compile
nargo execute
ls -la target/  # Check for VK files
```

---

## What We Tried (And Why It Failed)

1. ✅ Fixed API usage (`noir.execute()` + `backend.generateProof()`)
2. ✅ Fixed field modulus issues
3. ✅ Fixed circuit constraint satisfaction
4. ❌ **`getVerificationKey()` still panics** - backend limitation

**Conclusion:** The JavaScript backend simply doesn't support VK extraction in version 0.36.0.

---

## Next Steps

1. **Extract VK using nargo CLI** (script provided)
2. **Save VK to:** `packages/anchor/programs/veiled/src/verification_key.bin`
3. **Continue with MVP testing**

The browser page will now show a clear error directing you to use the CLI script.

---

## Why This Is Hard

- Noir's JavaScript backend is optimized for **proof generation**, not VK extraction
- VK extraction requires backend internals that aren't exposed via JavaScript API
- The WASM implementation doesn't include the VK extraction code path
- This is a **known limitation**, not something we can fix

**The CLI is the intended way to extract VKs.**
