// * Log permission access instruction
// * Creates audit log entries when permissions are actually used

use anchor_lang::prelude::*;
use crate::state::permission::*;

#[derive(Accounts)]
pub struct LogPermissionAccess<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + PermissionAccess::MAX_SIZE
    )]
    pub permission_access: Account<'info, PermissionAccess>,
    
    pub permission_grant: Account<'info, PermissionGrant>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handle_log_permission_access(
    ctx: Context<LogPermissionAccess>,
    permission_used: Permission,
    metadata: String,
) -> Result<()> {
    let permission_grant = &ctx.accounts.permission_grant;
    
    // * Verify permission exists and is valid
    require!(
        !permission_grant.revoked,
        crate::errors::VeiledError::PermissionRevoked
    );
    
    require!(
        permission_grant.expires_at > Clock::get()?.unix_timestamp,
        crate::errors::VeiledError::PermissionExpired
    );
    
    require!(
        permission_grant.permissions.contains(&permission_used),
        crate::errors::VeiledError::PermissionNotGranted
    );
    
    // * Validate metadata length
    require!(
        metadata.len() <= 100,
        crate::errors::VeiledError::DomainTooLong // * Reuse error for now
    );
    
    let access = &mut ctx.accounts.permission_access;
    access.permission_grant = permission_grant.key();
    access.accessed_at = Clock::get()?.unix_timestamp;
    access.permission_used = permission_used;
    access.metadata = metadata;
    
    emit!(PermissionAccessedEvent {
        nullifier: permission_grant.nullifier,
        app_id: permission_grant.app_id,
        permission: permission_used,
        accessed_at: access.accessed_at,
    });
    
    Ok(())
}

#[event]
pub struct PermissionAccessedEvent {
    pub nullifier: [u8; 32],
    pub app_id: Pubkey,
    pub permission: Permission,
    pub accessed_at: i64,
}
