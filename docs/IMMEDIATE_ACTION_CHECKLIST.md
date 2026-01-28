# Immediate Action Checklist

**Start here:** What to do RIGHT NOW to begin permission system integration

---

## ✅ Pre-Flight Checks

- [ ] Confirm Solana program is deployed to devnet
- [ ] Verify 7/7 tests still pass
- [ ] Check `packages/core` builds successfully
- [ ] Ensure devnet SOL available for testing

---

## 🚀 Day 1: Solana Permission System (4-6 hours)

### Step 1: Add Permission Types (15 min)
- [ ] Create `packages/anchor/programs/veiled/src/state/permission.rs`
- [ ] Copy `PermissionGrant` struct from `SOLANA_PERMISSIONS.md`
- [ ] Copy `PermissionAccess` struct
- [ ] Copy `Permission` enum (8 variants)
- [ ] Add `MAX_SIZE` constants

### Step 2: Create Instructions (1 hour)
- [ ] Create `packages/anchor/programs/veiled/src/instructions/grant_permissions.rs`
- [ ] Copy `GrantPermissions` struct and handler
- [ ] Create `packages/anchor/programs/veiled/src/instructions/revoke_permissions.rs`
- [ ] Copy `RevokePermissions` struct and handler
- [ ] Create `packages/anchor/programs/veiled/src/instructions/log_permission_access.rs`
- [ ] Copy `LogPermissionAccess` struct and handler

### Step 3: Update Program Lib (15 min)
- [ ] Add `pub mod state;` to `lib.rs`
- [ ] Add `pub mod instructions;` to `lib.rs`
- [ ] Add 3 new instruction handlers to `#[program]`
- [ ] Import permission types

### Step 4: Add Error Codes (10 min)
- [ ] Open `packages/anchor/programs/veiled/src/errors.rs`
- [ ] Add 5 new error variants:
  - `PermissionRevoked`
  - `PermissionExpired`
  - `PermissionNotGranted`
  - `UnauthorizedRevocation`
  - `TooManyPermissions`

### Step 5: Build & Test (30 min)
- [ ] Run `anchor build` (should compile)
- [ ] Run `anchor test` (should pass existing tests)
- [ ] Fix any compilation errors

### Step 6: Write Tests (2 hours)
- [ ] Create `packages/anchor/tests/permissions.test.ts`
- [ ] Test: Grant permissions
- [ ] Test: Revoke permissions
- [ ] Test: Log permission access
- [ ] Test: Reject revoked permission access
- [ ] Test: Reject expired permission access
- [ ] Run `anchor test` (all should pass)

### Step 7: Deploy to Devnet (30 min)
- [ ] Run `anchor deploy --provider.cluster devnet`
- [ ] Verify deployment succeeded
- [ ] Save program ID (if changed)

**Deliverable:** Permission system live on devnet ✅

---

## 🔧 Day 2: SDK Types & Integration (2-3 hours)

### Step 1: Extend Types (15 min)
- [ ] Open `packages/core/src/types.ts`
- [ ] Add `Permission` enum (8 values)
- [ ] Add `PermissionRequest` interface
- [ ] Add `PermissionGrant` interface
- [ ] Add `Session` interface (extends `AuthResult`)

### Step 2: Create Permission Modal (1 hour)
- [ ] Create `packages/core/src/ui/permission-modal.ts`
- [ ] Copy `PermissionModal` class from `SDK_PERMISSIONS.md`
- [ ] Copy CSS styles (inject via `injectStyles()`)
- [ ] Test modal shows/hides correctly

### Step 3: Extend VeiledAuth (1 hour)
- [ ] Open `packages/core/src/veiled-auth.ts`
- [ ] Add `permissionModal: PermissionModal` property
- [ ] Add `activePermissions: Map<string, PermissionGrant>` property
- [ ] Update `signIn()` signature:
  ```typescript
  async signIn(options?: {
    prove?: ProofType[];
    permissions?: PermissionRequest;
  }): Promise<Session>
  ```
- [ ] Add `requestPermissions()` private method
- [ ] Add `logPermissionAccess()` public method
- [ ] Add `revokePermissions()` public method
- [ ] Add `getAppId()` private method (domain → PDA)

### Step 4: Add Solana Program Methods (1 hour)
- [ ] Open `packages/core/src/solana/program.ts`
- [ ] Add `grantPermissions()` function
- [ ] Add `revokePermissions()` function
- [ ] Add `logPermissionAccess()` function
- [ ] Add `fetchPermissions()` function (read from chain)

### Step 5: Test Integration (30 min)
- [ ] Build SDK: `cd packages/core && bun run build`
- [ ] Create test script:
  ```typescript
  const veiled = new VeiledAuth({ ... });
  await veiled.signIn({
    permissions: {
      permissions: [Permission.RevealWalletAddress],
      reason: 'Test',
      duration: 3600
    }
  });
  ```
- [ ] Verify modal shows
- [ ] Verify permission granted on-chain

**Deliverable:** SDK supports permission requests ✅

---

## 🎯 Day 3: Wallet Circuit (4-6 hours)

### Step 1: Create Circuit Structure (30 min)
- [ ] Create `packages/circuit/src/wallet_ownership.nr`
- [ ] Define inputs:
  - `wallet_secret_key: [u8; 32]` (private)
  - `domain: Field` (public)
- [ ] Define outputs:
  - `nullifier: Field` (public)
  - `wallet_pubkey_hash: Field` (public)

### Step 2: Implement Circuit Logic (2 hours)
- [ ] Derive Ed25519 public key from secret key
- [ ] Hash public key → `wallet_pubkey_hash`
- [ ] Generate nullifier: `hash(wallet_secret_key || domain)`
- [ ] Add constraints (signature verification if needed)

### Step 3: Test Circuit (1 hour)
- [ ] Compile: `nargo compile`
- [ ] Test with mock inputs: `nargo test`
- [ ] Verify constraints < 15k

### Step 4: Integrate with SDK (1 hour)
- [ ] Update `packages/core/src/proof/generator.ts`
- [ ] Add `generateWalletOwnershipProof()` function
- [ ] Update `VeiledAuth.signIn()` to use wallet circuit
- [ ] Test end-to-end: wallet → proof → Solana → success

### Step 5: Test Full Flow (1 hour)
- [ ] Connect real Solana wallet
- [ ] Generate proof
- [ ] Submit to devnet
- [ ] Verify on-chain
- [ ] Check nullifier registered

**Deliverable:** Wallet ownership circuit working end-to-end ✅

---

## 📋 Quick Reference: File Locations

### Solana Program
- State: `packages/anchor/programs/veiled/src/state/permission.rs`
- Instructions: `packages/anchor/programs/veiled/src/instructions/*.rs`
- Lib: `packages/anchor/programs/veiled/src/lib.rs`
- Errors: `packages/anchor/programs/veiled/src/errors.rs`
- Tests: `packages/anchor/tests/permissions.test.ts`

### SDK
- Types: `packages/core/src/types.ts`
- Main class: `packages/core/src/veiled-auth.ts`
- Permission modal: `packages/core/src/ui/permission-modal.ts`
- Solana integration: `packages/core/src/solana/program.ts`

### Circuits
- Wallet: `packages/circuit/src/wallet_ownership.nr`
- Balance: `packages/circuit/src/balance_range.nr`
- NFT: `packages/circuit/src/nft_ownership.nr`

---

## 🐛 Common Issues & Fixes

### Issue: Anchor build fails
**Fix:** Check `lib.rs` has all `pub mod` statements

### Issue: Permission PDA derivation fails
**Fix:** Ensure seeds match exactly: `[b"permission", nullifier, app_id]`

### Issue: Modal doesn't show
**Fix:** Check CSS is injected, element is appended to DOM

### Issue: Permission grant fails
**Fix:** Verify payer has SOL, check account space calculation

### Issue: Circuit constraints too high
**Fix:** Optimize hash operations, reduce public inputs

---

## ✅ Success Indicators

After Day 1:
- ✅ `anchor test` passes with new permission tests
- ✅ Permission accounts deploy to devnet
- ✅ Can grant/revoke permissions via tests

After Day 2:
- ✅ SDK builds without errors
- ✅ Permission modal shows when requested
- ✅ Permissions stored on-chain after approval

After Day 3:
- ✅ Wallet circuit compiles
- ✅ Proof generates in <5 seconds
- ✅ Full auth flow works: wallet → proof → Solana → session

---

## 🚨 If You Get Stuck

1. **Check existing code:** Look at `verify_auth` implementation for patterns
2. **Read docs:** `SOLANA_PERMISSIONS.md`, `SDK_PERMISSIONS.md` have full examples
3. **Test incrementally:** Don't try to build everything at once
4. **Ask for help:** Share specific error messages or stuck points

---

**Ready?** Start with Day 1, Step 1! 🚀
