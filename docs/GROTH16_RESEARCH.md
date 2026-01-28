# Groth16 Verification Research

**Date:** 2026-01-25  
**Status:** Research in progress

---

## Search Results Summary

Web searches were performed for:
1. Groth16 verification libraries for Solana/Anchor
2. Arkworks Groth16 implementation
3. Noir verification key generation

**Note:** Search results were limited. Manual research needed.

---

## Recommended Libraries

### Option 1: Arkworks (Most Likely)

**Crate:** `ark-groth16` + `ark-bn254`

```toml
[dependencies]
ark-groth16 = "0.4"
ark-bn254 = "0.4"
ark-ec = "0.4"
ark-ff = "0.4"
```

**Pros:**
- Well-maintained Rust library
- Supports BN254 curve (used by Noir/Barretenberg)
- Good documentation
- Active development

**Cons:**
- May need Solana-specific optimizations
- Compute unit costs need testing

**Documentation:**
- https://github.com/arkworks-rs/groth16
- https://docs.rs/ark-groth16/

### Option 2: Bellman (Alternative)

**Crate:** `bellman`

```toml
[dependencies]
bellman = "0.1"
```

**Pros:**
- Used by Zcash
- Battle-tested

**Cons:**
- May not support BN254 directly
- Less active development

### Option 3: Custom Solana Implementation

**Approach:** Use existing Solana Groth16 verifier programs

**Research Needed:**
- Search GitHub for "solana groth16 verifier"
- Check if any programs expose verification as CPI
- Consider using existing on-chain verifier

---

## Verification Key Generation

### From Noir Circuit

```bash
cd packages/circuit
nargo compile
# Check target/ directory for verification key
```

**Noir 1.0+ Format:**
- Verification key may be in `target/veiled_circuit.json`
- Or generated separately with `nargo generate-verification-key` (if available)

**Barretenberg Format:**
- Noir uses Barretenberg backend
- Verification keys are BN254-based
- Format: JSON or binary

### Verification Key Structure

```json
{
  "protocol": "groth16",
  "curve": "bn254",
  "nPublic": 3,  // Number of public inputs
  "vk_alpha_1": "...",  // G1 point
  "vk_beta_2": "...",  // G2 point
  "vk_gamma_2": "...",  // G2 point
  "vk_delta_2": "...",  // G2 point
  "vk_alphabeta_12": "...",  // GT point (precomputed)
  "IC": [...]  // Public input coefficients
}
```

---

## Implementation Approach

### Step 1: Generate Verification Key

```bash
cd packages/circuit
nargo compile
# Extract verification key from target/veiled_circuit.json
```

### Step 2: Add Library to Cargo.toml

```toml
[dependencies]
ark-groth16 = "0.4"
ark-bn254 = "0.4"
ark-ec = "0.4"
ark-ff = "0.4"
```

### Step 3: Implement Verification

```rust
use ark_groth16::{Groth16, VerifyingKey};
use ark_bn254::{Bn254, Fr};
use ark_ec::pairing::Pairing;

pub fn verify_groth16_proof(
    proof: &Groth16Proof,
    public_inputs: &[u8],
    verification_key: &[u8],
) -> Result<()> {
    // Deserialize verification key
    let vk: VerifyingKey<Bn254> = serde_json::from_slice(verification_key)?;
    
    // Deserialize proof
    let proof_parsed = deserialize_proof(&proof)?;
    
    // Parse public inputs (3 Fields: walletPubkeyHash, domainHash, nullifier)
    let public_inputs_parsed = parse_public_inputs(public_inputs)?;
    
    // Verify
    Groth16::<Bn254>::verify(&vk, &public_inputs_parsed, &proof_parsed)
        .map_err(|_| VeiledError::InvalidProof)?;
    
    Ok(())
}
```

---

## Compute Unit Analysis

**Expected Costs:**
- Proof deserialization: ~1,000 CU
- VK loading: ~5,000 CU
- Pairing operations: ~100,000 CU
- Total: ~150,000 CU

**Solana Limits:**
- Transaction limit: 1,400,000 CU
- Should fit comfortably ✅

---

## Next Steps

1. **Generate verification key from Noir circuit**
   ```bash
   cd packages/circuit
   nargo compile
   # Check for verification key in target/
   ```

2. **Test arkworks library compatibility**
   - Add to Cargo.toml
   - Test compilation
   - Check compute unit costs

3. **Implement verification function**
   - Deserialize proof
   - Deserialize verification key
   - Parse public inputs
   - Call verifier

4. **Test end-to-end**
   - Generate proof with Noir
   - Submit to Anchor program
   - Verify transaction succeeds

---

## Resources

- **Arkworks Groth16:** https://github.com/arkworks-rs/groth16
- **Noir Documentation:** https://noir-lang.org/docs/
- **Barretenberg:** https://github.com/AztecProtocol/barretenberg
- **Groth16 Paper:** https://eprint.iacr.org/2016/260.pdf

---

## Notes

- Noir uses Barretenberg backend which outputs Groth16 proofs
- Verification keys are BN254-based
- Arkworks supports BN254, making it a good fit
- May need to test compute unit costs on Solana testnet
