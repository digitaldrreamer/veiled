# Verification Key Extraction Workaround

**Status:** `getVerificationKey()` not supported in current backend  
**Date:** 2026-01-25

---

## Problem

The `BarretenbergBackend.getVerificationKey()` method causes a WebAssembly panic ("unreachable executed") in `@noir-lang/backend_barretenberg@0.36.0`.

This indicates that:
1. The method may not be implemented in this backend version
2. The backend may require a different initialization sequence
3. VK extraction may not be supported via JavaScript API

---

## Solution: Use Nargo CLI

Since the JavaScript API doesn't support VK extraction, we need to use `nargo` CLI directly.

### Option 1: Check if VK is Generated During Compilation

```bash
cd packages/circuit
nargo compile
ls -la target/
# Look for files like:
# - verification_key.bin
# - vk.json
# - *.vk
```

### Option 2: Generate VK During Proof Generation

The verification key might be accessible during proof generation:

```bash
cd packages/circuit
nargo execute
# This may generate VK files in target/
```

### Option 3: Use Barretenberg CLI Directly

If `nargo` doesn't expose VK, we may need to use Barretenberg CLI:

```bash
# Check if bb CLI is available
which bb

# Generate VK from circuit
bb write_vk -b target/veiled_circuit.json -o target/verification_key.bin
```

### Option 4: Extract from Proof Generation Process

The VK might be embedded in the proof generation process. We can:

1. Generate a proof in the browser
2. Inspect the backend state after proof generation
3. Extract VK from backend internals (if accessible)

---

## Temporary Workaround: Placeholder VK

For MVP testing, we can use a placeholder VK that allows compilation:

```bash
# Create empty placeholder (will fail verification but allow compilation)
touch packages/anchor/programs/veiled/src/verification_key.bin
```

**Note:** This will allow the Anchor program to compile, but verification will fail. This is only for testing the integration flow.

---

## Long-term Solution

1. **Upgrade Backend:** Check if newer `@noir-lang/backend_barretenberg` version supports `getVerificationKey()`
2. **Use Different Backend:** Consider using `@aztec/bb.js` if it supports VK extraction
3. **CLI Integration:** Create a build script that uses `nargo` CLI to generate VK before building Anchor program
4. **Manual VK:** Generate VK once manually and commit it to the repo (acceptable for MVP)

---

## Next Steps

1. ✅ Document the issue
2. ⏳ Try `nargo execute` to see if VK is generated
3. ⏳ Check if `bb` CLI is available
4. ⏳ Create build script to auto-generate VK
5. ⏳ Update documentation with final solution

---

## References

- [Noir Documentation](https://noir-lang.org/docs)
- [Barretenberg GitHub](https://github.com/AztecProtocol/barretenberg)
- Research docs: `docs/groth16-vk-research.md`
