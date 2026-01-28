// * Permission system state types
// * Defines account structures for permission grants and access logs

use anchor_lang::prelude::*;

#[account]
pub struct PermissionGrant {
    /// * User's nullifier (anonymous ID)
    pub nullifier: [u8; 32],
    
    /// * Which app requested this
    pub app_id: Pubkey,
    
    /// * What permissions were granted
    pub permissions: Vec<Permission>,
    
    /// * When permission was granted
    pub granted_at: i64,
    
    /// * When permission expires
    pub expires_at: i64,
    
    /// * User can revoke anytime
    pub revoked: bool,
    
    /// * PDA bump
    pub bump: u8,
}

impl PermissionGrant {
    pub const MAX_SIZE: usize = 
        32 +           // nullifier
        32 +           // app_id
        (4 + 10 * 1) + // permissions vec (max 10)
        8 +            // granted_at
        8 +            // expires_at
        1 +            // revoked
        1;             // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Permission {
    /// * Reveal actual wallet address
    RevealWalletAddress,
    
    /// * Reveal exact SOL balance
    RevealExactBalance,
    
    /// * Reveal exact token balances
    RevealTokenBalances,
    
    /// * Reveal complete NFT list
    RevealNFTList,
    
    /// * Reveal transaction history
    RevealTransactionHistory,
    
    /// * Reveal staking positions
    RevealStakingPositions,
    
    /// * Reveal DeFi positions
    RevealDeFiPositions,
    
    /// * Access to sign transactions (future)
    SignTransactions,
}

/// * Track every permission access (audit log)
#[account]
pub struct PermissionAccess {
    /// * Which permission grant this refers to
    pub permission_grant: Pubkey,
    
    /// * When it was accessed
    pub accessed_at: i64,
    
    /// * Which permission was used
    pub permission_used: Permission,
    
    /// * Optional: What data was accessed
    pub metadata: String,
}

impl PermissionAccess {
    pub const MAX_SIZE: usize = 
        32 +          // permission_grant
        8 +           // accessed_at
        1 +           // permission_used
        (4 + 100);    // metadata (max 100 chars)
}
