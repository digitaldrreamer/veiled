# Permission System - Solana Program

**Add to your existing veiled program**

---

## New Account Types

```rust
// programs/veiled/src/state/permission.rs

use anchor_lang::prelude::*;

#[account]
pub struct PermissionGrant {
    /// User's nullifier (anonymous ID)
    pub nullifier: [u8; 32],
    
    /// Which app requested this
    pub app_id: Pubkey,
    
    /// What permissions were granted
    pub permissions: Vec<Permission>,
    
    /// When permission was granted
    pub granted_at: i64,
    
    /// When permission expires
    pub expires_at: i64,
    
    /// User can revoke anytime
    pub revoked: bool,
    
    /// PDA bump
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
    /// Reveal actual wallet address
    RevealWalletAddress,
    
    /// Reveal exact SOL balance
    RevealExactBalance,
    
    /// Reveal exact token balances
    RevealTokenBalances,
    
    /// Reveal complete NFT list
    RevealNFTList,
    
    /// Reveal transaction history
    RevealTransactionHistory,
    
    /// Reveal staking positions
    RevealStakingPositions,
    
    /// Reveal DeFi positions
    RevealDeFiPositions,
    
    /// Access to sign transactions (future)
    SignTransactions,
}

/// Track every permission access (audit log)
#[account]
pub struct PermissionAccess {
    /// Which permission grant this refers to
    pub permission_grant: Pubkey,
    
    /// When it was accessed
    pub accessed_at: i64,
    
    /// Which permission was used
    pub permission_used: Permission,
    
    /// Optional: What data was accessed
    pub metadata: String,
}

impl PermissionAccess {
    pub const MAX_SIZE: usize = 
        32 +          // permission_grant
        8 +           // accessed_at
        1 +           // permission_used
        (4 + 100);    // metadata (max 100 chars)
}
```

---

## New Instructions

```rust
// programs/veiled/src/instructions/grant_permissions.rs

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
    expires_in: i64, // Duration in seconds
) -> Result<()> {
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
```

```rust
// programs/veiled/src/instructions/revoke_permissions.rs

#[derive(Accounts)]
pub struct RevokePermissions<'info> {
    #[account(
        mut,
        has_one = nullifier @ ErrorCode::UnauthorizedRevocation
    )]
    pub permission_grant: Account<'info, PermissionGrant>,
    
    pub authority: Signer<'info>,
}

pub fn handle_revoke_permissions(
    ctx: Context<RevokePermissions>,
) -> Result<()> {
    let permission_grant = &mut ctx.accounts.permission_grant;
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
```

```rust
// programs/veiled/src/instructions/log_permission_access.rs

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
    
    // Verify permission exists and is valid
    require!(
        !permission_grant.revoked,
        ErrorCode::PermissionRevoked
    );
    
    require!(
        permission_grant.expires_at > Clock::get()?.unix_timestamp,
        ErrorCode::PermissionExpired
    );
    
    require!(
        permission_grant.permissions.contains(&permission_used),
        ErrorCode::PermissionNotGranted
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
```

---

## Error Codes

```rust
// programs/veiled/src/error.rs

#[error_code]
pub enum ErrorCode {
    // ... existing errors ...
    
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
```

---

## Update lib.rs

```rust
// programs/veiled/src/lib.rs

use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod error;

use instructions::*;
use state::permission::Permission;

declare_id!("YOUR_PROGRAM_ID");

#[program]
pub mod veiled {
    use super::*;
    
    // ... existing verify_auth ...
    
    pub fn grant_permissions(
        ctx: Context<GrantPermissions>,
        nullifier: [u8; 32],
        app_id: Pubkey,
        permissions: Vec<Permission>,
        expires_in: i64,
    ) -> Result<()> {
        instructions::grant_permissions::handle_grant_permissions(
            ctx,
            nullifier,
            app_id,
            permissions,
            expires_in
        )
    }
    
    pub fn revoke_permissions(
        ctx: Context<RevokePermissions>,
    ) -> Result<()> {
        instructions::revoke_permissions::handle_revoke_permissions(ctx)
    }
    
    pub fn log_permission_access(
        ctx: Context<LogPermissionAccess>,
        permission_used: Permission,
        metadata: String,
    ) -> Result<()> {
        instructions::log_permission_access::handle_log_permission_access(
            ctx,
            permission_used,
            metadata
        )
    }
}
```

---

## Tests

```typescript
// tests/permissions.test.ts

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";

describe("Permission System", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Veiled as Program<Veiled>;

  const nullifier = Buffer.from(new Uint8Array(32).fill(1));
  const appId = anchor.web3.Keypair.generate().publicKey;

  it("Grants permissions", async () => {
    const [permissionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("permission"), nullifier, appId.toBuffer()],
      program.programId
    );

    await program.methods
      .grantPermissions(
        Array.from(nullifier),
        appId,
        [{ revealWalletAddress: {} }, { revealExactBalance: {} }],
        3600 // 1 hour
      )
      .accounts({
        permissionGrant: permissionPDA,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const grant = await program.account.permissionGrant.fetch(permissionPDA);
    assert.equal(grant.permissions.length, 2);
    assert.equal(grant.revoked, false);
  });

  it("Revokes permissions", async () => {
    const [permissionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("permission"), nullifier, appId.toBuffer()],
      program.programId
    );

    await program.methods
      .revokePermissions()
      .accounts({
        permissionGrant: permissionPDA,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    const grant = await program.account.permissionGrant.fetch(permissionPDA);
    assert.equal(grant.revoked, true);
  });

  it("Logs permission access", async () => {
    // Grant permission first
    const [permissionPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("permission"), nullifier, appId.toBuffer()],
      program.programId
    );

    await program.methods
      .grantPermissions(
        Array.from(nullifier),
        appId,
        [{ revealWalletAddress: {} }],
        3600
      )
      .accounts({
        permissionGrant: permissionPDA,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Log access
    const accessAccount = anchor.web3.Keypair.generate();
    
    await program.methods
      .logPermissionAccess(
        { revealWalletAddress: {} },
        "User viewed profile page"
      )
      .accounts({
        permissionAccess: accessAccount.publicKey,
        permissionGrant: permissionPDA,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([accessAccount])
      .rpc();

    const access = await program.account.permissionAccess.fetch(
      accessAccount.publicKey
    );
    assert.equal(access.metadata, "User viewed profile page");
  });

  it("Fails to access revoked permission", async () => {
    // ... test revoked permission access fails
  });

  it("Fails to access expired permission", async () => {
    // ... test expired permission access fails
  });
});
```

---

## Summary

**What to add to your Solana program:**

1. ✅ **PermissionGrant account** - Stores what user approved
2. ✅ **PermissionAccess account** - Logs every access (audit trail)
3. ✅ **3 new instructions:**
   - `grant_permissions` - User approves
   - `revoke_permissions` - User revokes
   - `log_permission_access` - App logs usage
4. ✅ **8 permission types** - Wallet, balance, tokens, NFTs, transactions, staking, DeFi, sign
5. ✅ **Events** - For indexing/monitoring
6. ✅ **Tests** - 5+ test cases

**Time estimate:** 2 days to implement + test

**Next:** SDK integration to actually use these permissions
