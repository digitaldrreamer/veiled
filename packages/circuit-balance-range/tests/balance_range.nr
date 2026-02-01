use dep::veiled_balance_range;

#[test]
fn test_balance_range_valid_bucket_1() {
    // * 50 SOL in lamports falls into bucket 1: [10, 100) SOL
    let wallet_secret_key = [1; 32];
    let actual_balance: u64 = 50_000_000_000;
    let random_secret = 12345;

    // * Derive wallet_pubkey_hash using same simple_hash(bytes_to_field)
    let secret_field = {
        let mut acc: Field = 0;
        for i in 0..32 {
            acc = acc * 256 + (wallet_secret_key[i] as Field);
        }
        acc
    };
    let wallet_pubkey_hash = secret_field * 7 + 13;

    let minimum_balance: u64 = 10_000_000_000; // 10 SOL
    let balance_range_bucket: u64 = 1;
    let domain_hash = 42;

    // * Compute expected nullifier using same function as circuit
    let computed_nullifier =
        (wallet_pubkey_hash * 11 + domain_hash * 13 + random_secret * 17) * 19 + 23;

    veiled_balance_range::main(
        wallet_secret_key,
        actual_balance,
        random_secret,
        wallet_pubkey_hash,
        minimum_balance,
        balance_range_bucket,
        domain_hash,
        computed_nullifier,
    );
}

