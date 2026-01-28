// * Tests for wallet ownership circuit

use dep::veiled_circuit;

#[test]
fn test_wallet_ownership_valid() {
    // Test with valid inputs that satisfy circuit constraints
    let secret_key = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
    let random_secret = 1;
    let wallet_pubkey_hash = 0x70e151c232a31383f464d545b626970777e858c939aa1a8afb6bdc4cbd2d9ed;
    let domain_hash = 5;
    let nullifier = 0x27f3bf8b5722eeba86521de9b5814d18e4b07c4813dfab77430edaa6723f0aa;
    
    veiled_circuit::main(secret_key, random_secret, wallet_pubkey_hash, domain_hash, nullifier);
}
