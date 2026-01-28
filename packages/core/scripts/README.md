# Verification Key Generation

## Browser Method (Recommended)

1. **Copy circuit to demo static folder:**
   ```bash
   cp packages/circuit/target/veiled_circuit.json apps/demo/static/circuit/
   ```

2. **Start the demo app:**
   ```bash
   cd apps/demo && bun run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:5173/generate-vk-browser.html
   ```

4. **Click "Generate Verification Key"** and download the file

5. **Move the file:**
   ```bash
   mv ~/Downloads/verification_key.bin packages/anchor/programs/veiled/src/
   ```

## Alternative: Use the export function in code

You can also call `exportVerificationKey()` from the proof generator in a browser context:

```typescript
import { exportVerificationKey } from '@veiled/core';

const vk = await exportVerificationKey();
// Save to file or use directly
```

## Note

The Barretenberg backend requires Web Workers, which don't work in Node.js scripts. The browser method is the most reliable way to generate the verification key.
