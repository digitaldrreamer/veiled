# Verification Key Generation Guide

**Status:** Research needed  
**Last Updated:** 2026-01-25

---

## Current Status

The Noir circuit compiles successfully, but the compiled output (`veiled_circuit.json`) contains:
- Circuit bytecode
- ABI (input/output definitions)
- Debug symbols

**Missing:** Verification key for Groth16 verification

---

## How Noir Generates Verification Keys

### Option 1: Check Noir CLI Commands

```bash
cd packages/circuit
nargo --help
# Look for commands like:
# - nargo generate-verification-key
# - nargo verify
# - nargo keys
```

### Option 2: Barretenberg Backend

Noir uses Barretenberg as the proving backend. The verification key should be generated during the trusted setup or when compiling with keys.

**Check if verification key exists:**
```bash
cd packages/circuit
find target/ -name "*vk*" -o -name "*verification*" -o -name "*key*"
```

### Option 3: Noir.js API

The verification key might be accessible through Noir.js when generating proofs:

```typescript
import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';

const circuit = await loadCircuit();
const backend = new BarretenbergBackend(circuit.bytecode);

// Check if backend exposes verification key
// This might be in the circuit object or backend instance
```

---

## Verification Key Format

Groth16 verification keys typically contain:

```json
{
  "protocol": "groth16",
  "curve": "bn254",
  "nPublic": 3,  // Number of public inputs
  "vk_alpha_1": "...",  // G1 point (64 bytes)
  "vk_beta_2": "...",  // G2 point (128 bytes)
  "vk_gamma_2": "...",  // G2 point (128 bytes)
  "vk_delta_2": "...",  // G2 point (128 bytes)
  "vk_alphabeta_12": "...",  // GT point (precomputed pairing)
  "IC": [  // Public input coefficients (G1 points)
    "...",  // First coefficient
    "...",  // Second coefficient
    "..."   // Third coefficient
  ]
}
```

---

## Next Steps

1. **Check Noir Documentation**
   - Look for verification key generation commands
   - Check if it's part of `nargo compile` with flags

2. **Inspect Barretenberg Backend**
   - Check if verification key is embedded in circuit JSON
   - Look for separate key files

3. **Test Proof Generation**
   - Generate a proof using Noir.js
   - Check if verification key is accessible during proof generation
   - The backend might expose it

4. **Alternative: Generate from Circuit**
   - If Noir doesn't export it directly, might need to:
     - Extract circuit constraints
     - Generate verification key using Barretenberg directly
     - This is more complex but might be necessary

---

## Resources

- **Noir Documentation:** https://noir-lang.org/docs/
- **Barretenberg:** https://github.com/AztecProtocol/barretenberg
- **Noir.js:** https://www.npmjs.com/package/@noir-lang/noir_js

---

## Temporary Workaround

For MVP/demo purposes, we can:
1. Accept proofs without verification (current state)
2. Add clear security warnings
3. Document that verification key generation is pending

**For production:** Must have verification key and real verification before deployment.
