use dep::veiled_nft_ownership;

#[test]
fn test_nft_ownership_valid() {
    // * Test valid NFT ownership proof
    // * Wallet owns NFT from collection
    let wallet_secret_key = [1; 32];
    let nft_mint_address = [2; 32];  // Specific NFT mint (private)
    let random_secret = 12345;
    
    // * Derive wallet_pubkey_hash using same logic as circuit
    let secret_field = {
        let mut acc: Field = 0;
        for i in 0..32 {
            acc = acc * 256 + (wallet_secret_key[i] as Field);
        }
        acc
    };
    let wallet_pubkey_hash = secret_field * 7 + 13;
    
    // * Collection address (public)
    let collection_address = [3; 32];
    let domain_hash = 42;
    
    // * Compute expected nullifier using same function as circuit
    let computed_nullifier =
        (wallet_pubkey_hash * 11 + domain_hash * 13 + random_secret * 17) * 19 + 23;
    
    // * Should pass - valid NFT ownership
    veiled_nft_ownership::main(
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
    let random_secret = 67890;
    
    let secret_field = {
        let mut acc: Field = 0;
        for i in 0..32 {
            acc = acc * 256 + (wallet_secret_key[i] as Field);
        }
        acc
    };
    let wallet_pubkey_hash = secret_field * 7 + 13;
    
    let collection_address = [3; 32]; // Same collection
    let domain_hash = 42;
    
    let computed_nullifier =
        (wallet_pubkey_hash * 11 + domain_hash * 13 + random_secret * 17) * 19 + 23;
    
    // * Should pass - different NFT but same collection
    veiled_nft_ownership::main(
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
fn test_nft_ownership_different_collection() {
    // * Test with NFT from different collection (should still pass MVP check)
    // * Note: MVP collection check is lenient (just checks non-zero)
    // * In production, this would fail with proper merkle proof verification
    let wallet_secret_key = [1; 32];
    let nft_mint_address = [5; 32];  // Different NFT
    let random_secret = 11111;
    
    let secret_field = {
        let mut acc: Field = 0;
        for i in 0..32 {
            acc = acc * 256 + (wallet_secret_key[i] as Field);
        }
        acc
    };
    let wallet_pubkey_hash = secret_field * 7 + 13;
    
    let collection_address = [6; 32]; // Different collection (but non-zero, so MVP passes)
    let domain_hash = 42;
    
    let computed_nullifier =
        (wallet_pubkey_hash * 11 + domain_hash * 13 + random_secret * 17) * 19 + 23;
    
    // * MVP: Should pass (both addresses are non-zero)
    // * Production: Would fail with proper collection membership verification
    veiled_nft_ownership::main(
        wallet_secret_key,
        nft_mint_address,
        random_secret,
        wallet_pubkey_hash,
        collection_address,
        domain_hash,
        computed_nullifier,
    );
}
