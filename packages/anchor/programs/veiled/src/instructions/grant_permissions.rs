// * Grant permissions instruction
// * Allows apps to request and users to grant specific permissions

use anchor_lang::prelude::*;
use crate::state::permission::*;

#[derive(Accounts)]
#[instruction(nullifier: [u8; 32], app_id: Pubkey)]
pub struct GrantPermissions<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + PermissionGrant::MAX_SIZE,
        seeds = [
            b"permission",
            nullifier.as_ref(),
            app_id.as_ref()
        ],
        bump
    )]
    pub permission_grant: Account<'info, PermissionGrant>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handle_grant_permissions(
    ctx: Context<GrantPermissions>,
    nullifier: [u8; 32],
    app_id: Pubkey,
    permissions: Vec<Permission>,
    expires_in: i64, // * Duration in seconds
) -> Result<()> {
    // * Validate permissions count (prevent DoS)
    require!(
        permissions.len() <= 10,
        crate::errors::VeiledError::TooManyPermissions
    );
    
    let permission_grant = &mut ctx.accounts.permission_grant;
    let clock = Clock::get()?;
    
    permission_grant.nullifier = nullifier;
    permission_grant.app_id = app_id;
    permission_grant.permissions = permissions.clone();
    permission_grant.granted_at = clock.unix_timestamp;
    permission_grant.expires_at = clock.unix_timestamp + expires_in;
    permission_grant.revoked = false;
    permission_grant.bump = ctx.bumps.permission_grant;
    
    emit!(PermissionGrantedEvent {
        nullifier,
        app_id,
        permissions,
        granted_at: clock.unix_timestamp,
        expires_at: permission_grant.expires_at,
    });
    
    Ok(())
}

#[event]
pub struct PermissionGrantedEvent {
    pub nullifier: [u8; 32],
    pub app_id: Pubkey,
    pub permissions: Vec<Permission>,
    pub granted_at: i64,
    pub expires_at: i64,
}
