 // * Permission System Integration Tests
// *
// * Tests the permission grant, revoke, and access logging functionality
// *
// * Test Cases:
// * 1. Grant permissions (success path)
// * 2. Revoke permissions
// * 3. Log permission access
// * 4. Reject revoked permission access
// * 5. Reject expired permission access
// * 6. Reject access to non-granted permission
// * 7. Reject too many permissions

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { expect } from "chai";
import type { Veiled } from "../target/types/veiled";

describe("Permission System", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Veiled as Program<Veiled>;

  // * Test fixtures
  const nullifier = new Uint8Array(32).fill(1);
  const appId = Keypair.generate().publicKey;
  let permissionPDA: PublicKey;

  // * Helper: Derive permission PDA
  function getPermissionPDA(nullifier: Uint8Array, appId: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("permission"), Buffer.from(nullifier), appId.toBuffer()],
      program.programId
    );
    return pda;
  }

  // * Helper: Convert permission enum to Anchor format
  function toPermissionEnum(permission: string): any {
    const map: Record<string, any> = {
      revealWalletAddress: { revealWalletAddress: {} },
      revealExactBalance: { revealExactBalance: {} },
      revealTokenBalances: { revealTokenBalances: {} },
      revealNftList: { revealNftList: {} },
      revealTransactionHistory: { revealTransactionHistory: {} },
      revealStakingPositions: { revealStakingPositions: {} },
      revealDefiPositions: { revealDefiPositions: {} },
      signTransactions: { signTransactions: {} },
    };
    return map[permission] || { revealWalletAddress: {} };
  }

  before(async () => {
    // * Airdrop SOL if needed
    try {
      const balance = await provider.connection.getBalance(provider.wallet.publicKey);
      if (balance < 1e9) {
        await provider.connection.requestAirdrop(
          provider.wallet.publicKey,
          2e9
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.warn("Could not airdrop SOL:", error);
    }

    permissionPDA = getPermissionPDA(nullifier, appId);
  });

  // * Test 1: Grant permissions (success path)
  it("should grant permissions", async () => {
    const permissions = [
      { revealWalletAddress: {} },
      { revealExactBalance: {} },
    ];

    const expiresIn = 3600; // * 1 hour

    const txSignature = await program.methods
      .grantPermissions(
        Array.from(nullifier),
        appId,
        permissions,
        expiresIn
      )
      .accounts({
        permissionGrant: permissionPDA,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    expect(txSignature).to.exist;
    console.log("✓ Grant permissions test passed:", txSignature);

    // * Verify account was created
    const grant = await program.account.permissionGrant.fetch(permissionPDA);
    expect(grant.permissions.length).to.equal(2);
    expect(grant.revoked).to.equal(false);
    expect(grant.nullifier).to.deep.equal(Array.from(nullifier));
    expect(grant.appId.toString()).to.equal(appId.toString());
  });

  // * Test 2: Revoke permissions
  it("should revoke permissions", async () => {
    // * First grant permissions
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
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // * Then revoke
    const txSignature = await program.methods
      .revokePermissions()
      .accounts({
        permissionGrant: permissionPDA,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    expect(txSignature).to.exist;
    console.log("✓ Revoke permissions test passed:", txSignature);

    // * Verify revoked
    const grant = await program.account.permissionGrant.fetch(permissionPDA);
    expect(grant.revoked).to.equal(true);
  });

  // * Test 3: Log permission access
  it("should log permission access", async () => {
    // * Grant permission first
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
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // * Log access
    const accessAccount = Keypair.generate();

    const txSignature = await program.methods
      .logPermissionAccess(
        { revealWalletAddress: {} },
        "User viewed profile page"
      )
      .accounts({
        permissionAccess: accessAccount.publicKey,
        permissionGrant: permissionPDA,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([accessAccount])
      .rpc();

    expect(txSignature).to.exist;
    console.log("✓ Log permission access test passed:", txSignature);

    // * Verify access log
    const access = await program.account.permissionAccess.fetch(
      accessAccount.publicKey
    );
    expect(access.metadata).to.equal("User viewed profile page");
    expect(access.permissionGrant.toString()).to.equal(permissionPDA.toString());
  });

  // * Test 4: Reject revoked permission access
  it("should reject access to revoked permission", async () => {
    // * Grant and then revoke
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
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .revokePermissions()
      .accounts({
        permissionGrant: permissionPDA,
        authority: provider.wallet.publicKey,
      })
      .rpc();

    // * Try to log access (should fail)
    const accessAccount = Keypair.generate();

    try {
      await program.methods
        .logPermissionAccess(
          { revealWalletAddress: {} },
          "Attempted access"
        )
        .accounts({
          permissionAccess: accessAccount.publicKey,
          permissionGrant: permissionPDA,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([accessAccount])
        .rpc();

      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).to.include("PermissionRevoked");
      console.log("✓ Reject revoked permission test passed");
    }
  });

  // * Test 5: Reject expired permission access
  it("should reject access to expired permission", async () => {
    // * Grant with very short expiry (1 second)
    await program.methods
      .grantPermissions(
        Array.from(nullifier),
        appId,
        [{ revealWalletAddress: {} }],
        1 // * 1 second
      )
      .accounts({
        permissionGrant: permissionPDA,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // * Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // * Try to log access (should fail)
    const accessAccount = Keypair.generate();

    try {
      await program.methods
        .logPermissionAccess(
          { revealWalletAddress: {} },
          "Attempted access"
        )
        .accounts({
          permissionAccess: accessAccount.publicKey,
          permissionGrant: permissionPDA,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([accessAccount])
        .rpc();

      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).to.include("PermissionExpired");
      console.log("✓ Reject expired permission test passed");
    }
  });

  // * Test 6: Reject access to non-granted permission
  it("should reject access to non-granted permission", async () => {
    // * Grant only one permission
    await program.methods
      .grantPermissions(
        Array.from(nullifier),
        appId,
        [{ revealWalletAddress: {} }], // * Only wallet address
        3600
      )
      .accounts({
        permissionGrant: permissionPDA,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    // * Try to access different permission (should fail)
    const accessAccount = Keypair.generate();

    try {
      await program.methods
        .logPermissionAccess(
          { revealExactBalance: {} }, // * Not granted
          "Attempted access"
        )
        .accounts({
          permissionAccess: accessAccount.publicKey,
          permissionGrant: permissionPDA,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([accessAccount])
        .rpc();

      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).to.include("PermissionNotGranted");
      console.log("✓ Reject non-granted permission test passed");
    }
  });

  // * Test 7: Reject too many permissions
  it("should reject too many permissions", async () => {
    // * Try to grant 11 permissions (limit is 10)
    const tooManyPermissions = Array(11).fill({ revealWalletAddress: {} });

    try {
      await program.methods
        .grantPermissions(
          Array.from(nullifier),
          appId,
          tooManyPermissions,
          3600
        )
        .accounts({
          permissionGrant: permissionPDA,
          payer: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).to.include("TooManyPermissions");
      console.log("✓ Reject too many permissions test passed");
    }
  });
});
