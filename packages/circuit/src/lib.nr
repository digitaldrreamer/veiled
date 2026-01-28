// * Shared utilities for Veiled circuits
// * Common helper functions used across multiple circuits

/// Convert a 32-byte array to a Field element
pub fn bytes_to_field(bytes: [u8; 32]) -> Field {
    let mut result: Field = 0;
    for i in 0..32 {
        result = result * 256 + bytes[i] as Field;
    }
    result
}

/// Hash a domain string to a Field
pub fn hash_domain(domain: str) -> Field {
    // Convert string to bytes, then hash
    // Placeholder - will use proper string hashing
    std::hash::poseidon::bn254::hash_1([0])
}
