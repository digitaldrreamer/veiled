// * Custom error codes for Veiled program

use anchor_lang::prelude::*;

#[error_code]
pub enum VeiledError {
    #[msg("Invalid proof")]
    InvalidProof,

    #[msg("Nullifier already used")]
    DuplicateNullifier,

    #[msg("Proof expired")]
    ProofExpired,

    #[msg("Domain string exceeds maximum length of 255 characters")]
    DomainTooLong,

    #[msg("Invalid public inputs")]
    InvalidPublicInputs,

    // * Ed25519 signature verification security errors
    #[msg("Offset mismatch - points to wrong instruction")]
    OffsetMismatch,

    #[msg("Invalid instruction data")]
    InvalidInstructionData,

    #[msg("Invalid signature count")]
    InvalidSignatureCount,

    #[msg("Invalid message size")]
    InvalidMessageSize,

    #[msg("Proof hash mismatch")]
    ProofHashMismatch,

    #[msg("Is valid mismatch")]
    IsValidMismatch,

    #[msg("Authority public key mismatch")]
    AuthorityMismatch,

    #[msg("Expected Ed25519 program")]
    BadEd25519Program,

    #[msg("Bad Ed25519 accounts")]
    BadEd25519Accounts,

    // * Permission system errors
    #[msg("Permission has been revoked")]
    PermissionRevoked,

    #[msg("Permission has expired")]
    PermissionExpired,

    #[msg("Permission not granted")]
    PermissionNotGranted,

    #[msg("Unauthorized to revoke this permission")]
    UnauthorizedRevocation,

    #[msg("Too many permissions requested")]
    TooManyPermissions,
}
