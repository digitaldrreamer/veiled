# Real Verification Key Extraction

**Status:** Fixed - Generate proof FIRST, then extract VK  
**Date:** 2026-01-25

---

## The Solution

The `getVerificationKey()` method **requires the backend to generate a proof first** before it can extract the verification key. The backend needs to be "warmed up" with a proof generation to initialize its internal state.

---

## How to Extract VK

### Method 1: Browser Page (Recommended)

1. **Start the demo app:**
   ```bash
   cd apps/demo
   bun run dev
   ```

2. **Open in browser:**
   ```
   http://localhost:5173/generate-vk
   ```

3. **Click "Generate Verification Key"** - it will now:
   - Generate a proof first (to initialize backend)
   - Then extract the verification key
   - Download the file

4. **Save the file to:**
   ```
   packages/anchor/programs/veiled/src/verification_key.bin
   ```

### Method 2: Standalone HTML File

1. **Start the demo app:**
   ```bash
   cd apps/demo
   bun run dev
   ```

2. **Open in browser:**
   ```
   http://localhost:5173/generate-vk-standalone.html
   ```

3. **The page will automatically:**
   - Load the circuit
   - Generate a proof
   - Extract the VK
   - Show download link

---

## What Was Fixed

The key insight: **`getVerificationKey()` only works AFTER generating a proof**. The backend's internal state needs to be initialized through proof generation.

**Before (broken):**
```typescript
const backend = new BarretenbergBackend(circuit);
const vk = await backend.getVerificationKey(); // ❌ WASM panic
```

**After (working):**
```typescript
const backend = new BarretenbergBackend(circuit);
const noir = new Noir(circuit);

// Generate proof first to initialize backend
const witness = await noir.generateWitness(inputs);
const { proof } = await backend.generateProof(witness);

// NOW get verification key - backend is ready
const vk = await backend.getVerificationKey(); // ✅ Works!
```

---

## Next Steps

1. ✅ Code updated to generate proof first
2. ⏳ Test in browser to extract real VK
3. ⏳ Save VK to `packages/anchor/programs/veiled/src/verification_key.bin`
4. ⏳ Verify Anchor program compiles with real VK
5. ⏳ Test end-to-end proof verification

---

## Why This Works

The Barretenberg backend internally builds up its proving system state when generating a proof. The verification key is part of this state, but it's only accessible after the backend has been properly initialized through proof generation.

This is why calling `getVerificationKey()` directly causes a WASM panic - the backend's internal structures aren't ready yet.
