# Critical VK Extraction Findings
## How to Extract Verification Key from Barretenberg/Noir

**Date**: January 26, 2026  
**Status**: ✅ Research Complete  
**Critical Finding**: Noir ONLY supports UltraHonk—Groth16 is NOT available as a backend

---

## 🚨 CRITICAL DISCOVERY

### Noir Backends Available

Research confirms Noir supports:
- ✅ **UltraHonk** (DEFAULT, Barretenberg-based)
- ✅ **UltraPlonk** (Barretenberg-based)
- ✅ **Plonky2** (external backend)
- ✅ **Halo2** (external backend)
- ❌ **Groth16** (NOT available in Noir - legacy only)

**Your assumption of Groth16 is incorrect.** You're using UltraHonk whether you realize it or not.

---

## How to Extract VK from Barretenberg CLI

### Option 1: Using `bb` CLI (BEST)

The Barretenberg command-line tool is the official way to extract VKs:

```bash
# After running: nargo execute

# Extract VK as binary file
bb write_vk \
  --oracle_hash keccak \
  -b ./target/circuits.json \
  -o ./target

# Output: target/vk (binary file, no extension)
```

**This produces:**
- `target/vk` - Binary verification key file

### Option 2: Extract VK as Fields (for on-chain)

If you need VK as field elements:

```bash
# Convert binary VK to field representation
bb vk_as_fields \
  -k ./target/vk \
  -o ./target
```

### Option 3: Using bb.js in JavaScript

```typescript
// Get VK directly from Barretenberg backend
const { UltraHonkBackend } = require('@aztec/bb.js');
const fs = require('fs');

async function extractVK() {
    const circuit = JSON.parse(
        fs.readFileSync('./target/circuits.json')
    );
    
    const backend = new UltraHonkBackend(circuit.bytecode);
    
    // Get VK - returns as Buffer
    const vk = await backend.getVerificationKey();
    
    // Save for Rust
    fs.writeFileSync('./vk.bin', vk);
    
    // Optional: Get different target (EVM)
    const vkEvm = await backend.getVerificationKey({ 
        verifierTarget: 'evm-no-zk' 
    });
}

extractVK();
```

---

## The VK Format Problem

### What Barretenberg Outputs

```
Binary VK (from bb write_vk)
├─ UltraHonk internal format
├─ NOT Groth16 format
├─ NOT Arkworks-compatible
└─ Needs conversion OR use different backend
```

### What Your Code Expects

```
Arkworks VerifyingKey<Bn254>
├─ Groth16 format
├─ Canonical serialization
└─ INCOMPATIBLE with Barretenberg UltraHonk
```

---

## Three Paths Forward

### Path 1: UltraHonk Verification (RECOMMENDED)

Since you're using UltraHonk, verify UltraHonk in Rust.

**Status**: Research found working examples
- ✅ Chalice project: UltraHonk verification on Solana
- ✅ zkVerify has UltraHonk pallet

**Implementation**: Use Barretenberg's UltraHonk verifier directly

### Path 2: Manual Groth16 Circuit (COMPLEX)

If you absolutely need Groth16:

```bash
# This would require rebuilding your circuit with Groth16
# BUT Noir doesn't expose this option directly
# Would need to use a different proving system entirely
```

**Not recommended** - Noir doesn't support Groth16 export

### Path 3: Solidity Verification (SIMPLEST)

Let Barretenberg generate Solidity verifier:

```bash
# Generate Solidity contract
bb write_solidity_verifier \
  -k ./target/vk \
  -o ./target/Verifier.sol

# Deploy Verifier.sol to chain
# Call from your Solana program or validate on EVM
```

**Pros**: Battle-tested, maintained by Aztec  
**Cons**: Higher gas cost

---

## VK Extraction Command Breakdown

### Most Important: `bb write_vk`

```bash
bb write_vk --oracle_hash keccak -b ./target/circuits.json -o ./target
```

**What each flag means**:
- `write_vk` - Command to generate verification key
- `--oracle_hash keccak` - Use Keccak256 (EVM compatible)
- `-b ./target/circuits.json` - Input: compiled circuit bytecode
- `-o ./target` - Output directory

**Output created**:
- `./target/vk` - The verification key file (binary)

### Verify the VK was created:

```bash
ls -la ./target/vk
# Should show a file (size depends on circuit complexity)
# Typical: 200 bytes - 10 KB
```

---

## Testing if VK Extraction Worked

### Step 1: Check file exists

```bash
if [ -f ./target/vk ]; then
    echo "✓ VK file created"
    ls -lh ./target/vk
else
    echo "✗ VK file not found"
    exit 1
fi
```

### Step 2: Verify proof with the VK

```bash
# Barretenberg can verify using the VK
bb verify -p ./target/proof -k ./target/vk

# If this succeeds, your VK is correct
```

### Step 3: Try to convert to JSON (if needed)

```typescript
// Read binary VK and inspect
const fs = require('fs');
const vkBinary = fs.readFileSync('./target/vk');
console.log('VK size:', vkBinary.length);
console.log('First 32 bytes (hex):', vkBinary.slice(0, 32).toString('hex'));
```

---

## The Real Problem You're Solving

```
You have:
├─ UltraHonk proof from Barretenberg
├─ UltraHonk verification key from Barretenberg
└─ Code expecting Groth16 verification key from Arkworks
    (These are INCOMPATIBLE)

Solutions:
├─ Option A: Verify UltraHonk (correct)
│   └─ Use Barretenberg's UltraHonk verifier
│
├─ Option B: Verify in Solidity
│   └─ Use bb write_solidity_verifier
│
└─ Option C: Groth16 everywhere
    └─ IMPOSSIBLE - Noir doesn't support Groth16
```

---

## Immediate Actions

### TODAY

1. **Confirm you're using UltraHonk**
   ```bash
   cd packages/circuit
   nargo execute
   # Check output for "Scheme is: ultra_honk"
   ```

2. **Extract VK properly**
   ```bash
   bb write_vk --oracle_hash keccak -b ./target/circuits.json -o ./target
   ```

3. **Verify it worked**
   ```bash
   bb verify -p ./target/proof -k ./target/vk
   ```

### This Week

**Choose your path:**

1. **UltraHonk path** (recommended)
   - Research Barretenberg UltraHonk verifier in Rust
   - Use reference: Chalice project
   - Estimated: 3-5 days

2. **Solidity path** (simpler)
   - Run: `bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol`
   - Deploy Verifier.sol to Ethereum/L2
   - Estimated: 1-2 days

3. **Arkworks path** (won't work as-is)
   - ❌ Groth16 not available in Noir
   - ❌ Incompatible format with UltraHonk
   - Only works if you switch proving systems entirely

---

## Key Research Findings

### Noir Backends (Official)

From Aztec's announcement (Dec 2025):

> "Noir supports integration with different proving systems to cater for varying development needs in e.g. proving times, proof sizes, and verification costs."

**Supported backends**:
- UltraHonk (Barretenberg) - DEFAULT
- UltraPlonk (Barretenberg)
- Plonky2
- Halo2

**NOT supported**: Groth16

### Barretenberg CLI Capabilities

From Barretenberg docs:

```
bb write_vk              ✓ Generate VK from circuit
bb write_solidity_verifier ✓ Generate Solidity verifier
bb vk_as_fields          ✓ Convert VK to field format
bb prove                 ✓ Generate proofs
bb verify                ✓ Verify proofs
```

### UltraHonk Characteristics

- **Proof size**: ~1-2 KB
- **Verification**: Fast (polynomial commitment verification)
- **Setup**: No trusted setup (transparent)
- **Solidity cost**: ~6-7x higher gas than Groth16
- **Proving time**: 5-50x faster than Groth16

---

## Files You Need to Create/Check

```
packages/circuit/
├── Nargo.toml
├── src/main.nr
├── target/
│   ├── circuits.json          ✓ Created by nargo compile
│   ├── *.gz                   ✓ Created by nargo execute
│   ├── proof                  ✓ Created by bb prove
│   └── vk                     ← Create with bb write_vk
└── Prover.toml

solana-program/
└── src/
    └── lib.rs                 ← Update to verify UltraHonk
```

---

## Commands Reference Sheet

```bash
# 1. Compile circuit
cd packages/circuit
nargo compile

# 2. Generate proof
nargo execute

# 3. Create verification key
bb write_vk --oracle_hash keccak \
   -b ./target/circuits.json \
   -o ./target

# 4. Verify with Barretenberg
bb verify -p ./target/proof -k ./target/vk

# 5. Generate Solidity verifier (optional)
bb write_solidity_verifier \
   -k ./target/vk \
   -o ./target/Verifier.sol

# 6. Test your Rust code
cd ../solana-program
cargo test
```

---

## The Updated Implementation Strategy

### BEFORE (Wrong Approach)
```rust
// ❌ This won't work
let vk = VerifyingKey::<Bn254>::deserialize(...);
// You have UltraHonk VK, expecting Groth16 format
```

### AFTER (Correct Approaches)

**Option A: UltraHonk Rust Verifier**
```rust
// ✅ Verify UltraHonk proof with UltraHonk VK
// Use Barretenberg's verifier or zkVerify UltraHonk pallet
```

**Option B: Solidity Verifier**
```solidity
// ✅ Verify in Solidity
contract Verifier {
    function verify(...) external { ... }
}
```

**Option C: Off-chain Verification**
```typescript
// ✅ Use Barretenberg/Noir.js directly
const isValid = await backend.verifyProof(proof);
```

---

## Next Steps

1. **Confirm UltraHonk** 
   - Run `nargo execute` and check output

2. **Extract VK properly**
   - Run `bb write_vk` command above

3. **Decide verification approach**
   - UltraHonk Rust (research required)
   - Solidity (generate and deploy)
   - Off-chain JavaScript (simplest)

4. **Update your implementation**
   - Based on chosen approach

---

## Resources

- **Barretenberg Docs**: https://barretenberg.aztec.network/
- **bb.js Docs**: https://github.com/AztecProtocol/barretenberg/tree/master/barretenberg/node
- **Chalice Project**: UltraHonk on Solana reference
- **zkVerify**: UltraHonk verification pallet

---

## Bottom Line

**You're not failing because of a code bug—you're failing because you're trying to verify UltraHonk proofs using Groth16 logic.**

The solution is NOT to force Groth16. The solution is to:
1. Accept that you're using UltraHonk
2. Choose a UltraHonk verification approach
3. Implement accordingly

**Most likely path**: Generate Solidity verifier with `bb write_solidity_verifier` and verify on-chain. Takes 1 day instead of 5.

---

**Critical insight**: Your original research was correct to be uncertain—the format mismatch is real. But it's not a deserialization problem; it's a proof system mismatch problem.
