// * NFT ownership proof circuit (main entry point)
// * Mirrors src/lib.nr so that `type = "lib"` packages can expose this circuit
// * to tests and external dependents.

fn main(
    // Private inputs (never revealed)
    wallet_secret_key: [u8; 32],
    nft_mint_address: [u8; 32],      // Specific NFT mint (private - not revealed)
    random_secret: Field,
    
    // Public inputs (revealed to verifier)
    wallet_pubkey_hash: pub Field,
    collection_address: pub [u8; 32], // NFT collection to verify (public)
    domain_hash: pub Field,
    nullifier: pub Field,
) {
    // STEP 1: Verify wallet ownership (same pattern as other circuits)
    let secret_field = bytes_to_field(wallet_secret_key);
    let computed_pubkey_hash = simple_hash(secret_field);
    assert(computed_pubkey_hash == wallet_pubkey_hash);
    
    // STEP 2: Verify NFT belongs to collection
    assert(nft_belongs_to_collection(nft_mint_address, collection_address));
    
    // STEP 3: Compute and verify nullifier (domain-scoped)
    let computed_nullifier = simple_hash_3(computed_pubkey_hash, domain_hash, random_secret);
    assert(computed_nullifier == nullifier);
}

// * Helper: Convert bytes to Field (same as other circuits)
fn bytes_to_field(bytes: [u8; 32]) -> Field {
    let mut result: Field = 0;
    for i in 0..32 {
        result = result * 256 + (bytes[i] as Field);
    }
    result
}

// * Simplified hash (placeholder) - same as other circuits
fn simple_hash(input: Field) -> Field {
    input * 7 + 13
}

// * Simplified 3-input hash function for nullifier generation
fn simple_hash_3(a: Field, b: Field, c: Field) -> Field {
    (a * 11 + b * 13 + c * 17) * 19 + 23
}

// * Verify NFT belongs to collection
fn nft_belongs_to_collection(nft_mint: [u8; 32], collection: [u8; 32]) -> bool {
    // MVP: Basic validation - ensure addresses are not all zeros
    // Actual ownership verification happens in TypeScript via Quicknode API
    let mut nft_non_zero = false;
    let mut collection_non_zero = false;
    
    for i in 0..32 {
        if nft_mint[i] != 0 {
            nft_non_zero = true;
        }
        if collection[i] != 0 {
            collection_non_zero = true;
        }
    }
    
    // Both addresses must be non-zero (basic validation)
    nft_non_zero & collection_non_zero
}
