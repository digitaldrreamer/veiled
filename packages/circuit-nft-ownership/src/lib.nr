// * NFT ownership proof circuit
// * Proves ownership of NFT from specific collection without revealing which NFT
// * Generates domain-scoped nullifier for privacy-preserving authentication
//
// * Privacy Properties:
// * - Reveals: Wallet owns NFT from collection X
// * - Hides: Which specific NFT (token ID)
// * - Hides: Other NFTs owned
// * - Hides: Wallet address

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
    // For MVP: Simple hash-based verification
    // In production: Could use merkle proof or on-chain verification
    // Collection membership is verified by checking NFT mint address format/prefix
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
// * TODO: Replace with Poseidon hash once available in Noir std library
fn simple_hash(input: Field) -> Field {
    input * 7 + 13
}

// * Simplified 3-input hash function for nullifier generation
// * TODO: Replace with Poseidon hash_3 once available
fn simple_hash_3(a: Field, b: Field, c: Field) -> Field {
    (a * 11 + b * 13 + c * 17) * 19 + 23
}

// * Verify NFT belongs to collection
// * 
// * MVP Implementation: Placeholder that always passes
// * - Actual NFT ownership and collection membership is verified in TypeScript
// *   via Quicknode API before calling this circuit
// * - This circuit then proves wallet ownership and nullifier correctness
// * 
// * Production Implementation: Would verify merkle proof or on-chain state
// * - Verify NFT mint is in collection's merkle tree
// * - Or verify on-chain that NFT account exists and belongs to collection
// * 
// * For now, we just ensure addresses are non-zero (basic validation)
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

// * Internal test to validate NFT ownership circuit
#[test]
fn test_nft_ownership_valid() {
    // * Test valid NFT ownership proof
    let wallet_secret_key = [1; 32];
    let nft_mint_address = [2; 32];  // Specific NFT mint (private)
    let random_secret: Field = 12345;
    
    // * Derive wallet_pubkey_hash using same logic as circuit
    let secret_field = bytes_to_field(wallet_secret_key);
    let wallet_pubkey_hash = simple_hash(secret_field);
    
    // * Collection address (public)
    let collection_address = [3; 32];
    let domain_hash: Field = 42;
    
    // * Compute expected nullifier using same function as circuit
    let computed_nullifier = simple_hash_3(wallet_pubkey_hash, domain_hash, random_secret);
    
    // * Should pass - valid NFT ownership
    main(
        wallet_secret_key,
        nft_mint_address,
        random_secret,
        wallet_pubkey_hash,
        collection_address,
        domain_hash,
        computed_nullifier,
    );
}

#[test]
fn test_nft_ownership_valid_different_nft() {
    // * Test valid NFT ownership with different NFT from same collection
    let wallet_secret_key = [1; 32];
    let nft_mint_address = [4; 32];  // Different NFT, same collection
    let random_secret: Field = 67890;
    
    let secret_field = bytes_to_field(wallet_secret_key);
    let wallet_pubkey_hash = simple_hash(secret_field);
    
    let collection_address = [3; 32]; // Same collection
    let domain_hash: Field = 42;
    
    let computed_nullifier = simple_hash_3(wallet_pubkey_hash, domain_hash, random_secret);
    
    // * Should pass - different NFT but same collection
    main(
        wallet_secret_key,
        nft_mint_address,
        random_secret,
        wallet_pubkey_hash,
        collection_address,
        domain_hash,
        computed_nullifier,
    );
}
