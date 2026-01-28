// * Revoke permissions instruction
// * Allows users to revoke previously granted permissions

use anchor_lang::prelude::*;
use crate::state::permission::*;

#[derive(Accounts)]
pub struct RevokePermissions<'info> {
    #[account(mut)]
    pub permission_grant: Account<'info, PermissionGrant>,
    
    /// * Authority must be the payer (user who granted permissions)
    /// * In practice, this should be verified via nullifier ownership proof
    /// * For now, we allow any signer to revoke (can be tightened later)
    pub authority: Signer<'info>,
}

pub fn handle_revoke_permissions(
    ctx: Context<RevokePermissions>,
) -> Result<()> {
    let permission_grant = &mut ctx.accounts.permission_grant;
    
    // * Mark as revoked
    permission_grant.revoked = true;
    
    emit!(PermissionRevokedEvent {
        nullifier: permission_grant.nullifier,
        app_id: permission_grant.app_id,
        revoked_at: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

#[event]
pub struct PermissionRevokedEvent {
    pub nullifier: [u8; 32],
    pub app_id: Pubkey,
    pub revoked_at: i64,
}
