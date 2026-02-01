// * Balance range proof circuit (library entry point)
// * Mirrors src/main.nr so that `type = "lib"` packages can expose this circuit
// * to tests and external dependents.

fn main(
    // Private inputs
    wallet_secret_key: [u8; 32],
    actual_balance: u64,
    random_secret: Field,

    // Public inputs
    wallet_pubkey_hash: pub Field,
    minimum_balance: pub u64,
    balance_range_bucket: pub u64,
    domain_hash: pub Field,
    nullifier: pub Field,
) {
    // STEP 1: Convert secret key bytes to Field (reuse wallet_ownership pattern)
    let secret_field = bytes_to_field(wallet_secret_key);

    // STEP 2: Compute wallet pubkey hash (commitment)
    let computed_pubkey_hash = simple_hash(secret_field);
    assert(computed_pubkey_hash == wallet_pubkey_hash);

    // STEP 3: Ensure balance meets minimum requirement (integer comparison)
    assert(actual_balance >= minimum_balance);

    // STEP 4: Compute balance range bucket and verify claimed bucket
    let computed_bucket = compute_range_bucket(actual_balance);
    assert(computed_bucket == balance_range_bucket);

    // STEP 5: Compute and verify nullifier (domain-scoped)
    let computed_nullifier =
        simple_hash_3(computed_pubkey_hash, domain_hash, random_secret);
    assert(computed_nullifier == nullifier);
}

// * Helper: Convert bytes to Field (same as wallet_ownership circuit)
fn bytes_to_field(bytes: [u8; 32]) -> Field {
    let mut result: Field = 0;
    for i in 0..32 {
        result = result * 256 + (bytes[i] as Field);
    }
    result
}

// * Simplified hash (placeholder) - same function as wallet_ownership
fn simple_hash(input: Field) -> Field {
    input * 7 + 13
}

// * Simplified 3-input hash function for nullifier generation
fn simple_hash_3(a: Field, b: Field, c: Field) -> Field {
    (a * 11 + b * 13 + c * 17) * 19 + 23
}

// * Compute which balance range bucket the balance falls into.
// * Ranges are defined in lamports (1 SOL = 1_000_000_000 lamports):
// * 0: [0, 10 SOL)
// * 1: [10, 100 SOL)
// * 2: [100, 1000 SOL)
// * 3: [1000 SOL, +inf)
fn compute_range_bucket(balance: u64) -> u64 {
    let ten_sol: u64 = 10_000_000_000;
    let hundred_sol: u64 = 100_000_000_000;
    let thousand_sol: u64 = 1_000_000_000_000;

    if balance < ten_sol {
        0
    } else if balance < hundred_sol {
        1
    } else if balance < thousand_sol {
        2
    } else {
        3
    }
}

// * Internal test to validate balance range circuit
#[test]
fn test_balance_range_valid_bucket_1() {
    // * 50 SOL in lamports falls into bucket 1: [10, 100) SOL
    let wallet_secret_key = [1; 32];
    let actual_balance: u64 = 50_000_000_000;
    let random_secret: Field = 12345;

    // * Derive wallet_pubkey_hash using same bytes_to_field + simple_hash
    let mut secret_field: Field = 0;
    for i in 0..32 {
        secret_field = secret_field * 256 + (wallet_secret_key[i] as Field);
    }
    let wallet_pubkey_hash = simple_hash(secret_field);

    let minimum_balance: u64 = 10_000_000_000; // 10 SOL
    let balance_range_bucket: u64 = 1; // 10-100 SOL bucket
    let domain_hash: Field = 42;

    // * Compute expected nullifier using same function as circuit
    let computed_nullifier =
        simple_hash_3(wallet_pubkey_hash, domain_hash, random_secret);

    main(
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


