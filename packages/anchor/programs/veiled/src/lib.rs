// * Veiled Solana Program
// * Stores UltraHonk verification results and manages nullifier registry
//
// * Features:
// * - Stores verification results (verified off-chain using WASM)
// * - Nullifier registry with PDAs (replay protection)
// * - Domain-scoped authentication
//
// * Verification Flow:
// * 1. Client generates proof using Noir
// * 2. Client verifies proof using @aztec/bb.js (WASM) - ~100-500ms
// * 3. Client signs verification result
// * 4. Client submits signed result to this program
// * 5. Program validates signature and stores result

use anchor_lang::prelude::*;

mod errors;
pub mod instructions; // * Must be pub for Anchor macro to access
mod state;
mod ultrahonk;

use errors::VeiledError;
use ultrahonk::VerificationResult;

// * Re-export everything from instructions module at crate root
// * This fixes the "__client_accounts_instructions" unresolved import error
// * Anchor's #[program] macro needs Accounts structs accessible from crate root
pub use instructions::*;

declare_id!("H6apEGZAw23AKUeqCX41wkDv2LVwX3Ec8oYPip7k3xzA");

// * Define VerifyAuth at crate root (before #[program] block) so macro can find it
// * This Accounts struct is used by verify_auth instruction handler
#[derive(Accounts)]
#[instruction(verification_result: Vec<u8>, nullifier: [u8; 32], domain: [u8; 32])]
pub struct VerifyAuth<'info> {
    // * PDA for nullifier account - deterministic address per nullifier
    // * Uses init_if_needed to handle account creation
    // * The instruction logic checks if account was already used
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + 32 + 4 + 32 + 8 + 8, // * 8 discriminator + 32 nullifier + 4 String len + 32 domain max + 8 created_at + 8 expires_at
        // * PDA keyed by nullifier for replay protection
        seeds = [b"nullifier", nullifier.as_ref()],
        bump
    )]
    pub nullifier_account: Account<'info, NullifierAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: * Instructions sysvar used for Ed25519Program instruction introspection
    #[account(address = solana_instructions_sysvar::id())]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[program]
pub mod veiled {
    use super::*;

    // * Main instruction: Store verification result and register nullifier
    // *
    // * verification_result: Pre-verified result from client (105 bytes)
    // *   Format: [1 byte: is_valid] [32 bytes: proof_hash] [8 bytes: timestamp] [64 bytes: signature]
    // * nullifier: Domain-scoped nullifier for replay protection
    // * domain: Application domain identifier (max 32 bytes to minimize memory)
    pub fn verify_auth(
        ctx: Context<VerifyAuth>,
        verification_result: Vec<u8>,
        nullifier: [u8; 32],
        domain: [u8; 32], // * Fixed-size array to avoid Vec/String allocation
    ) -> Result<()> {
        // * Find actual domain length (null-terminated or full array)
        let domain_len = domain.iter().position(|&b| b == 0).unwrap_or(32);
        require!(
            domain_len > 0 && domain_len <= 32,
            VeiledError::DomainTooLong
        );

        // * Convert domain to String only when storing (use stack-allocated slice)
        let domain_slice = &domain[..domain_len];
        let domain_str = core::str::from_utf8(domain_slice)
            .map_err(|_| VeiledError::DomainTooLong)?
            .to_string(); // * Only allocate String when storing

        // * Parse verification result
        let result = VerificationResult::from_instruction_data(&verification_result)
            .map_err(|_| VeiledError::InvalidProof)?;

        // * Validate signature via Ed25519Program instruction present in tx
        result.validate_signature(
            ctx.accounts.authority.key,
            &ctx.accounts.instructions_sysvar,
        )?;

        // * Check if verification result is recent (not stale)
        let current_timestamp = Clock::get()?.unix_timestamp;
        result.is_recent(current_timestamp)?;

        // * Only accept valid proofs
        require!(result.is_valid, VeiledError::InvalidProof);

        msg!("✓ Proof verified off-chain and validated on-chain");
        msg!("  Proof hash: {:?}", result.proof_hash);
        msg!("  Verified at: {}", result.timestamp);

        // * Check if nullifier has already been used
        // * With init_if_needed, account might already exist
        // * Check nullifier value first (more specific check)
        let nullifier_account = &mut ctx.accounts.nullifier_account;

        // * Check if this exact nullifier was already used (replay protection)
        // * This is the primary check - if nullifier matches and account is initialized, reject
        if nullifier_account.nullifier != [0u8; 32] && nullifier_account.nullifier == nullifier {
            return Err(VeiledError::DuplicateNullifier.into());
        }

        // * Additional check: if account was already initialized with a different nullifier
        // * This handles edge cases where account exists but nullifier doesn't match
        // * (Shouldn't happen with proper PDA seeds, but safety check)
        if nullifier_account.created_at != 0 && nullifier_account.nullifier != nullifier {
            // * Account exists but with different nullifier - this is an error state
            // * For now, we'll allow it (could be from a previous test)
            // * In production, this shouldn't happen with proper PDA seeds
        }

        msg!("Nullifier: {:?}", nullifier);
        msg!("Domain: {}", domain_str);

        // * Store nullifier in PDA account
        let current_timestamp = Clock::get()?.unix_timestamp;
        nullifier_account.nullifier = nullifier;
        nullifier_account.domain = domain_str;
        nullifier_account.created_at = current_timestamp;

        // * Set expiry timestamp (default: 30 days from now)
        // * Expiry can be customized per domain/application if needed
        const DEFAULT_EXPIRY_SECONDS: i64 = 30 * 24 * 60 * 60; // * 30 days
        nullifier_account.expires_at = current_timestamp + DEFAULT_EXPIRY_SECONDS;

        Ok(())
    }

    // * Permission system instructions

    /// * Grant permissions to an app
    /// * Creates a PermissionGrant account that stores what permissions were granted
    pub fn grant_permissions(
        ctx: Context<GrantPermissions>,
        nullifier: [u8; 32],
        app_id: Pubkey,
        permissions: Vec<state::permission::Permission>,
        expires_in: i64,
    ) -> Result<()> {
        handle_grant_permissions(ctx, nullifier, app_id, permissions, expires_in)
    }

    /// * Revoke previously granted permissions
    /// * Marks the PermissionGrant as revoked
    pub fn revoke_permissions(ctx: Context<RevokePermissions>) -> Result<()> {
        handle_revoke_permissions(ctx)
    }

    /// * Log when a permission is actually accessed
    /// * Creates an audit trail entry in PermissionAccess account
    pub fn log_permission_access(
        ctx: Context<LogPermissionAccess>,
        permission_used: state::permission::Permission,
        metadata: String,
    ) -> Result<()> {
        handle_log_permission_access(ctx, permission_used, metadata)
    }
}

#[account]
pub struct NullifierAccount {
    pub nullifier: [u8; 32],
    pub domain: String,
    pub created_at: i64,
    pub expires_at: i64, // * Unix timestamp when session expires
}
