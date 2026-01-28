# Verification Key Generation Guide

**Status:** Scripts created, ready to generate  
**Last Updated:** 2026-01-25

---

## Quick Start

### Step 1: Generate Verification Key (Browser Method)

1. **Ensure circuit is compiled:**
   ```bash
   cd packages/circuit
   nargo compile
   ```

2. **Copy circuit to demo static folder:**
   ```bash
   cd ../..
   cp packages/circuit/target/veiled_circuit.json apps/demo/static/circuit/
   ```

3. **Start demo app:**
   ```bash
   cd apps/demo
   bun run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:5173/generate-vk
   ```

5. **Click "Generate Verification Key"** button

6. **Download the file** and save it to:
   ```
   packages/anchor/programs/veiled/src/verification_key.bin
   ```

### Step 2: Verify It Works

```bash
cd packages/anchor
bun run check
```

If the file is loaded correctly, compilation will succeed.

---

## Alternative: Programmatic Export

You can also export the verification key programmatically in a browser context:

```typescript
import { exportVerificationKey } from '@veiled/core';

// In browser console or app code
const vk = await exportVerificationKey();
console.log('Verification key:', vk);

// Download as file
const blob = new Blob([vk], { type: 'application/octet-stream' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'verification_key.bin';
a.click();
```

---

## Why Browser Method?

The Barretenberg backend uses Web Workers (via Comlink) which don't work in Node.js scripts. The browser environment provides the necessary APIs for Web Workers to function.

---

## Verification Key Format

- **Format:** Binary (Uint8Array)
- **Size:** Varies by circuit complexity (typically 1-10 KB)
- **Usage:** Loaded at compile time in Rust using `include_bytes!()`

---

## Next Steps After Generation

1. ✅ Verification key generated
2. ⏳ Implement actual Groth16 verification in `groth16.rs`
3. ⏳ Test with real proofs
4. ⏳ Deploy to devnet

---

## Troubleshooting

**Error: "Failed to load circuit"**
- Make sure `veiled_circuit.json` is in `apps/demo/static/circuit/`
- Check that circuit is compiled: `cd packages/circuit && nargo compile`

**Error: "Unreachable code"**
- This means you're trying to run in Node.js
- Use the browser method instead

**Verification key is empty**
- Make sure you downloaded the file correctly
- Check file size (should be > 0 bytes)
- Regenerate if needed
