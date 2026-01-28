# Circuit Design Specifications

**Zero-Knowledge Circuit Design for Veiled**

---

## Overview

Veiled uses Noir circuits to generate zero-knowledge proofs that verify wallet ownership and eligibility without revealing sensitive information.

### Circuit Goals

1. **Prove wallet ownership** without revealing wallet address
2. **Generate unique nullifiers** per wallet + domain combination
3. **Verify eligibility** (balance, NFT ownership) without revealing exact data
4. **Fast generation** (<5 seconds in browser)
5. **Small proof size** (<1KB for efficient on-chain verification)

---

## Circuit 1: Basic Wallet Ownership

**File:** `packages/circuit/src/wallet_ownership.nr`

### Purpose
Prove a user owns a Solana wallet without revealing the wallet address.

### Inputs

**Private Inputs** (never revealed):
```noir
struct PrivateInputs {
    wallet_secret_key: [u8; 32],    // Ed25519 secret key
    random_secret: Field,            // Random value for nullifier uniqueness
}
```

**Public Inputs** (revealed to verifier):
```noir
struct PublicInputs {
    wallet_pubkey_hash: pub Field,   // Hash of public key (commitment)
    domain_hash: pub Field,          // Hash of dApp domain
    nullifier: pub Field,            // Unique identifier per wallet+domain
    timestamp: pub u64,              // Proof generation time
}
```

### Circuit Logic

```noir
use dep::std;

fn main(
    // Private
    wallet_secret_key: [u8; 32],
    random_secret: Field,
    
    // Public
    wallet_pubkey_hash: pub Field,
    domain_hash: pub Field,
    nullifier: pub Field,
    timestamp: pub u64,
) {
    // STEP 1: Derive public key from secret key
    // This proves we know the secret key
    let public_key = std::ec::ed25519::derive_public_key(wallet_secret_key);
    
    // Convert public key to Field for hashing
    let pubkey_field = bytes_to_field(public_key);
    
    // STEP 2: Verify public key hash matches
    // This creates a commitment to our wallet without revealing it
    let computed_pubkey_hash = std::hash::poseidon::bn254::hash_1([pubkey_field]);
    assert(computed_pubkey_hash == wallet_pubkey_hash);
    
    // STEP 3: Compute and verify nullifier
    // Nullifier = hash(pubkey + domain + secret)
    // This gives us unique ID per wallet+domain that's unlinkable across domains
    let computed_nullifier = std::hash::poseidon::bn254::hash_3([
        pubkey_field,
        domain_hash,
        random_secret
    ]);
    assert(computed_nullifier == nullifier);
    
    // STEP 4: Verify timestamp is recent
    // Prevents replay attacks with old proofs
    let current_time = get_current_timestamp();
    assert(timestamp <= current_time);
    assert(timestamp >= current_time - 300); // Within 5 minutes
}

// Helper function to convert bytes to Field
fn bytes_to_field(bytes: [u8; 32]) -> Field {
    let mut result: Field = 0;
    for i in 0..32 {
        result = result * 256 + bytes[i] as Field;
    }
    result
}

// Get current timestamp (placeholder - will be passed from JS)
fn get_current_timestamp() -> u64 {
    // In practice, this comes from public inputs
    0
}
```

### Why This Design?

**Wallet Address Protection:**
- We never reveal `wallet_secret_key` or the derived `public_key`
- We only reveal `wallet_pubkey_hash` (a commitment)
- Verifier can't reverse hash to get wallet address

**Nullifier Properties:**
- `nullifier = hash(wallet + domain + secret)`
- Same wallet + same domain = same nullifier (consistent identity)
- Same wallet + different domain = different nullifier (unlinkable)
- Can't reverse nullifier to get wallet (one-way hash)

**Freshness:**
- Timestamp constraint prevents replaying old proofs
- 5-minute window balances security vs. UX

### Constraint Count Estimate

```
Ed25519 derive: ~10,000 constraints
Poseidon hash (x2): ~300 constraints each
Timestamp checks: ~10 constraints
---
Total: ~10,600 constraints
```

**Target:** Keep under 15,000 for fast generation

### Testing Strategy

```noir
// tests/wallet_ownership.nr
#[test]
fn test_valid_proof() {
    let secret_key = generate_test_key();
    let public_key = derive_public_key(secret_key);
    let pubkey_hash = hash(public_key);
    let domain_hash = hash("example.com");
    let secret = random_field();
    let nullifier = hash([public_key, domain_hash, secret]);
    let timestamp = current_time();
    
    // Should pass
    main(secret_key, secret, pubkey_hash, domain_hash, nullifier, timestamp);
}

#[test]
fn test_invalid_pubkey_hash() {
    let secret_key = generate_test_key();
    let wrong_hash = hash("wrong");
    
    // Should fail
    main(secret_key, secret, wrong_hash, domain_hash, nullifier, timestamp);
}

#[test]
fn test_expired_timestamp() {
    let old_timestamp = current_time() - 600; // 10 minutes old
    
    // Should fail
    main(secret_key, secret, pubkey_hash, domain_hash, nullifier, old_timestamp);
}
```

---

## Circuit 2: Balance Range Proof

**File:** `packages/circuit/src/balance_range.nr`

### Purpose
Prove wallet balance meets minimum requirement without revealing exact amount.

### Inputs

```noir
struct PrivateInputs {
    wallet_secret_key: [u8; 32],
    actual_balance: Field,           // Exact balance (private)
    balance_proof: [Field; 32],      // Merkle proof of balance
    random_secret: Field,
}

struct PublicInputs {
    wallet_pubkey_hash: pub Field,
    minimum_balance: pub Field,      // Required minimum
    balance_range_bucket: pub Field, // e.g., "10-100", "100-1000"
    merkle_root: pub Field,          // Root of balance tree
    domain_hash: pub Field,
    nullifier: pub Field,
    timestamp: pub u64,
}
```

### Circuit Logic

```noir
fn main(
    // Private
    wallet_secret_key: [u8; 32],
    actual_balance: Field,
    balance_proof: [Field; 32],
    random_secret: Field,
    
    // Public
    wallet_pubkey_hash: pub Field,
    minimum_balance: pub Field,
    balance_range_bucket: pub Field,
    merkle_root: pub Field,
    domain_hash: pub Field,
    nullifier: pub Field,
    timestamp: pub u64,
) {
    // STEP 1: Verify wallet ownership (same as Circuit 1)
    let public_key = std::ec::ed25519::derive_public_key(wallet_secret_key);
    let pubkey_field = bytes_to_field(public_key);
    let computed_hash = std::hash::poseidon::bn254::hash_1([pubkey_field]);
    assert(computed_hash == wallet_pubkey_hash);
    
    // STEP 2: Verify balance is in valid range bucket
    // Buckets: 0-10, 10-100, 100-1000, 1000-10000, etc.
    assert(balance_in_bucket(actual_balance, balance_range_bucket));
    
    // STEP 3: Verify balance meets minimum
    assert(actual_balance >= minimum_balance);
    
    // STEP 4: Verify balance proof (Merkle proof from RPC)
    assert(verify_merkle_proof(
        actual_balance,
        balance_proof,
        merkle_root
    ));
    
    // STEP 5: Compute nullifier (same as Circuit 1)
    let computed_nullifier = std::hash::poseidon::bn254::hash_3([
        pubkey_field,
        domain_hash,
        random_secret
    ]);
    assert(computed_nullifier == nullifier);
    
    // STEP 6: Verify timestamp
    let current_time = get_current_timestamp();
    assert(timestamp <= current_time);
    assert(timestamp >= current_time - 300);
}

// Check if balance fits in declared range bucket
fn balance_in_bucket(balance: Field, bucket: Field) -> bool {
    // Bucket encoding:
    // 0 = 0-10
    // 1 = 10-100
    // 2 = 100-1000
    // 3 = 1000-10000
    // etc.
    
    let lower = power_of_10(bucket);
    let upper = power_of_10(bucket + 1);
    
    (balance >= lower) & (balance < upper)
}

fn power_of_10(exp: Field) -> Field {
    let mut result = 1;
    for i in 0..exp {
        result = result * 10;
    }
    result
}

fn verify_merkle_proof(
    leaf: Field,
    proof: [Field; 32],
    root: Field
) -> bool {
    let mut current = leaf;
    
    for i in 0..32 {
        if proof[i] != 0 {
            current = std::hash::poseidon::bn254::hash_2([current, proof[i]]);
        }
    }
    
    current == root
}
```

### Selective Disclosure

**What's revealed:**
- Minimum balance is met: ✅
- Balance range bucket: ✅ (e.g., "100-1000 SOL")
- Exact balance: ❌ (remains private)

**Example:**
```
User has 573 SOL
Proves: balance > 100 SOL ✅
Reveals: "100-1000 SOL" range
Hides: exact amount (573)
```

---

## Circuit 3: NFT Ownership Proof

**File:** `packages/circuit/src/nft_ownership.nr`

### Purpose
Prove ownership of NFT from specific collection without revealing which token.

### Inputs

```noir
struct PrivateInputs {
    wallet_secret_key: [u8; 32],
    token_mint: Field,               // Specific NFT mint address
    nft_merkle_proof: [Field; 32],   // Proof NFT is in collection
    random_secret: Field,
}

struct PublicInputs {
    wallet_pubkey_hash: pub Field,
    collection_address: pub Field,   // NFT collection
    collection_merkle_root: pub Field, // Root of collection tree
    domain_hash: pub Field,
    nullifier: pub Field,
    timestamp: pub u64,
}
```

### Circuit Logic

```noir
fn main(
    // Private
    wallet_secret_key: [u8; 32],
    token_mint: Field,
    nft_merkle_proof: [Field; 32],
    random_secret: Field,
    
    // Public
    wallet_pubkey_hash: pub Field,
    collection_address: pub Field,
    collection_merkle_root: pub Field,
    domain_hash: pub Field,
    nullifier: pub Field,
    timestamp: pub u64,
) {
    // STEP 1: Verify wallet ownership
    let public_key = std::ec::ed25519::derive_public_key(wallet_secret_key);
    let pubkey_field = bytes_to_field(public_key);
    let computed_hash = std::hash::poseidon::bn254::hash_1([pubkey_field]);
    assert(computed_hash == wallet_pubkey_hash);
    
    // STEP 2: Verify NFT belongs to collection
    // Merkle proof that token_mint is in collection tree
    assert(verify_merkle_proof(
        token_mint,
        nft_merkle_proof,
        collection_merkle_root
    ));
    
    // STEP 3: Verify token is owned by wallet
    // This requires checking on-chain state
    // For simplicity, we trust the merkle proof includes ownership
    // (In production, would verify token account PDA)
    
    // STEP 4: Compute nullifier
    let computed_nullifier = std::hash::poseidon::bn254::hash_3([
        pubkey_field,
        domain_hash,
        random_secret
    ]);
    assert(computed_nullifier == nullifier);
    
    // STEP 5: Verify timestamp
    let current_time = get_current_timestamp();
    assert(timestamp <= current_time);
    assert(timestamp >= current_time - 300);
}
```

### Privacy Properties

**What's revealed:**
- Owns NFT from collection X: ✅
- Collection address: ✅
- Specific token ID: ❌
- Other NFTs owned: ❌

**Use case:**
```
User owns Okay Bear #1234
Proves: "I own an Okay Bear" ✅
Reveals: "Okay Bears collection" ✅
Hides: "Which Okay Bear (#1234)" ❌
```

---

## Circuit Optimization Strategies

### 1. Minimize Constraints

**Bad:**
```noir
// Expensive: Multiple hashes
let h1 = hash(a);
let h2 = hash(b);
let h3 = hash(c);
let result = hash([h1, h2, h3]);
```

**Good:**
```noir
// Cheaper: Single hash
let result = hash([a, b, c]);
```

### 2. Use Poseidon Over SHA-256

```noir
// SLOW (5000+ constraints)
let hash = std::hash::sha256(input);

// FAST (~150 constraints)
let hash = std::hash::poseidon::bn254::hash_1([input]);
```

**Why:** Poseidon is designed for ZK circuits, SHA-256 is not.

### 3. Batch Operations

```noir
// Instead of:
for i in 0..10 {
    assert(verify_signature(sigs[i]));
}

// Do:
let batch_valid = verify_signatures_batch(sigs);
assert(batch_valid);
```

### 4. Precompute Constants

```noir
// Precompute at compile time
const DOMAIN_HASH: Field = compute_hash("example.com");

// Use precomputed value (0 constraints)
assert(input_domain == DOMAIN_HASH);
```

---

## Testing Requirements

### Unit Tests

```bash
# Run Noir tests
cd packages/circuit
nargo test
```

**Test coverage:**
- [ ] Valid proof generates successfully
- [ ] Invalid secret key fails
- [ ] Wrong pubkey hash fails
- [ ] Expired timestamp fails
- [ ] Invalid nullifier fails
- [ ] Balance proofs with various amounts
- [ ] NFT proofs with valid/invalid collections

### Integration Tests

```typescript
// Test with real wallet
import { generateProof } from '@veiled/circuit';
import { Keypair } from '@solana/web3.js';

const wallet = Keypair.generate();
const proof = await generateProof({
  secretKey: wallet.secretKey,
  domain: 'test.com',
});

assert(proof.nullifier.length === 64);
assert(proof.proof.length < 1024);
```

### Performance Tests

**Targets:**
- Proof generation: <5 seconds
- Proof size: <1KB
- Constraints: <15,000

**Benchmark:**
```bash
# Measure proof generation time
time nargo prove

# Check constraint count
nargo info
```

---

## Circuit Compilation

### Development Build

```bash
cd packages/circuit
nargo compile
```

### Production Build

```bash
# Compile with optimizations
nargo compile --force

# Convert to WASM
nargo codegen-verifier

# Optimize WASM size
wasm-opt target/circuit.wasm -O3 -o dist/circuit.wasm

# Verify size (<5MB target)
ls -lh dist/circuit.wasm
```

### CDN Deployment

```bash
# Upload to CDN
aws s3 cp dist/circuit.wasm s3://veiled-circuits/v1/
aws s3 cp dist/verification_key.json s3://veiled-circuits/v1/

# Set public read permissions
aws s3api put-object-acl --bucket veiled-circuits \
  --key v1/circuit.wasm --acl public-read
```

---

## Security Considerations

### Soundness

**Ensure proofs can't be forged:**
- Use well-tested Noir stdlib functions
- Don't implement custom crypto
- Audit circuits before mainnet

### Privacy Leaks

**Check for information leakage:**
- No private inputs in error messages
- No timing side-channels
- No constraint leaks

### Replay Protection

**Prevent proof reuse:**
- Include timestamp (5-min window)
- Nullifier registry on-chain
- Domain binding

---

## Next Steps

1. **Week 1:** Implement Circuit 1 (wallet ownership)
2. **Week 2:** Add Circuits 2 & 3 (balance, NFT)
3. **Week 3:** Optimize and test
4. **Week 4:** Audit and document

**Start with:** `packages/circuit/src/wallet_ownership.nr`
