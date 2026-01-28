# Next Steps Analysis: Permission System Integration

**Date:** Jan 27, 2026  
**Context:** Permission system expansion on top of existing 3-circuit plan

---

## Executive Summary

You've expanded scope from **3 circuits + SDK + demo** to include a **full permission system** (Solana program changes + SDK modal + browser extension). This is a significant but valuable addition that strengthens the hackathon submission.

**Key Decision Point:** The original plan stated "No additional on-chain changes needed" but the permission system requires 3 new Solana program instructions. This is **additive** (doesn't break existing `verify_auth`), but requires careful integration.

---

## Current State vs. Expanded Plan

### ✅ What's Already Done
1. **Solana Program (`verify_auth`)**: Production-ready, 7/7 tests passing
   - Ed25519 signature validation
   - Domain-scoped nullifiers
   - Replay protection
   - Memory/encoding optimizations

2. **Core SDK (`packages/core`)**: Basic proof generation + submission
   - `VeiledAuth` class exists
   - Proof generation pipeline working
   - On-chain submission working
   - **Missing:** Permission system integration

3. **Circuit Infrastructure**: Noir setup ready
   - `packages/circuit/` exists
   - Basic circuit structure in place
   - **Missing:** 3 circuits (wallet, balance, NFT)

### 🆕 What's Being Added (Permission System)

1. **Solana Program Changes** (`SOLANA_PERMISSIONS.md`)
   - `PermissionGrant` account (stores granted permissions)
   - `PermissionAccess` account (audit log)
   - 3 new instructions: `grant_permissions`, `revoke_permissions`, `log_permission_access`
   - 8 permission types (wallet, balance, tokens, NFTs, transactions, staking, DeFi, sign)

2. **SDK Changes** (`SDK_PERMISSIONS.md`)
   - Permission modal UI component
   - `signIn()` extended to accept permission requests
   - `logPermissionAccess()` for audit trail
   - `revokePermissions()` for user control

3. **Browser Extension** (`BROWSER_EXTENSION.md`)
   - Popup showing current site permissions
   - Access log (last 24h)
   - Revoke button

4. **Updated Timeline** (`UPDATED_PLAN.md`)
   - Week 1: Circuits + Permission System
   - Week 2: Demo App + Extension
   - Week 3: Polish + Submit

---

## Critical Gaps & Conflicts

### 1. **Scope Conflict**
- **Original Plan:** "No additional on-chain changes needed"
- **Reality:** Permission system requires 3 new Solana instructions
- **Resolution:** This is **additive** - `verify_auth` stays unchanged, permissions are optional layer

### 2. **SDK Architecture Mismatch**
- **Current SDK:** `VeiledAuth.signIn()` returns `AuthResult` with `nullifier`
- **Permission SDK:** Expects `signIn(options?: { permissions?: PermissionRequest })` returning `Session` with `permissions[]`
- **Resolution:** Need to extend `VeiledAuth` class, not replace it

### 3. **Missing Integration Points**
- Permission system assumes `Session` type exists (not in current `types.ts`)
- Permission modal expects `window.Veiled` global (not in current SDK)
- Browser extension expects `window.__veiledInstance` (not in current SDK)

### 4. **Circuit-to-Permission Mapping**
- Original plan: 3 circuits (wallet, balance, NFT)
- Permission system: 8 permission types
- **Question:** Do circuits map 1:1 to permissions, or are permissions independent?
- **Recommendation:** Permissions are **post-auth** (after proof verification), circuits are **pre-auth** (for proof generation)

---

## Recommended Implementation Order

### Phase 1: Foundation (Days 1-3) - **CRITICAL PATH**

#### Day 1: Solana Permission System
**Priority:** HIGH (blocks SDK integration)

**Tasks:**
1. Add permission accounts to Solana program
   ```rust
   // programs/veiled/src/state/permission.rs
   pub struct PermissionGrant { ... }
   pub struct PermissionAccess { ... }
   pub enum Permission { ... }
   ```

2. Implement 3 new instructions
   - `grant_permissions`
   - `revoke_permissions`
   - `log_permission_access`

3. Add error codes
   - `PermissionRevoked`
   - `PermissionExpired`
   - `PermissionNotGranted`
   - `UnauthorizedRevocation`

4. Write tests (5+ cases)
   - Grant permissions
   - Revoke permissions
   - Log access
   - Reject revoked/expired permissions

5. Deploy to devnet

**Deliverable:** Permission system live on devnet, tests passing

#### Day 2: Wallet Ownership Circuit
**Priority:** HIGH (core functionality)

**Tasks:**
1. Write Noir circuit (`circuits/wallet_ownership/src/main.nr`)
   - Input: wallet secret key (private), domain (public)
   - Output: nullifier (public), wallet pubkey hash (public)
   - Constraint: Ed25519 signature verification

2. Test with real Solana wallet
3. Optimize constraints (<15k)
4. Connect SDK to Solana program
5. Test full flow: client → proof → Solana → success

**Deliverable:** One working demo (wallet ownership proof)

#### Day 3: SDK Permission Integration
**Priority:** HIGH (enables permission UX)

**Tasks:**
1. Extend `VeiledAuth` class
   ```typescript
   // Add to packages/core/src/veiled-auth.ts
   async signIn(options?: {
     prove?: ProofType[];
     permissions?: PermissionRequest;
   }): Promise<Session>
   ```

2. Add `Session` type to `types.ts`
   ```typescript
   export interface Session {
     nullifier: string;
     signature: string;
     verified: boolean;
     permissions: Permission[];
     expiresAt: number;
   }
   ```

3. Create permission modal component
   - `packages/core/src/ui/permission-modal.ts`
   - Inject styles
   - Show/hide logic

4. Integrate with Solana program
   - `grantPermissions()` method
   - `logPermissionAccess()` method
   - `revokePermissions()` method

5. Test permission request flow

**Deliverable:** SDK supports permission requests

---

### Phase 2: Circuits + RPC Integration (Days 4-6)

#### Day 4-5: Balance + NFT Circuits
**Priority:** MEDIUM (bounty requirements)

**Tasks:**
1. Balance range circuit (`circuits/balance_range/src/main.nr`)
   - Input: balance (private), min/max (public)
   - Output: boolean (public) - balance in range
   - Integrate Helius RPC for balance queries

2. NFT ownership circuit (`circuits/nft_ownership/src/main.nr`)
   - Input: NFT list (private), collection (public)
   - Output: boolean (public) - owns NFT from collection
   - Integrate Quicknode for NFT metadata

3. Test both circuits
4. Update SDK to support all 3 circuit types

**Deliverable:** All 3 circuits working

#### Day 6: RPC Provider Abstraction
**Priority:** MEDIUM (clean architecture)

**Tasks:**
1. Create RPC provider interface
   ```typescript
   interface RpcProvider {
     getBalance(address: string): Promise<number>;
     getNfts(address: string, collection?: string): Promise<Nft[]>;
   }
   ```

2. Implement Helius provider
3. Implement Quicknode provider
4. Update SDK to use providers

**Deliverable:** Clean RPC abstraction

---

### Phase 3: UX Layer (Days 7-10)

#### Day 7-8: Demo App Foundation
**Priority:** HIGH (showcase)

**Tasks:**
1. Build split-view layout
2. Implement traditional auth (show everything)
3. Implement Veiled auth (show nothing)
4. Add comparison table
5. Make responsive

**Deliverable:** Basic demo working

#### Day 9: Demo Enhancement
**Priority:** MEDIUM (polish)

**Tasks:**
1. Add permission request flows
2. Show all 3 circuit types
3. Add privacy score indicators
4. Polish UI/UX

**Deliverable:** Polished demo

#### Day 10: Browser Extension
**Priority:** LOW (nice-to-have)

**Tasks:**
1. Create extension manifest
2. Build popup UI
3. Connect to Solana (read permissions)
4. Display access log
5. Implement revoke button

**Deliverable:** Working extension

---

## Immediate Next Steps (Today)

### Step 1: Resolve SDK Architecture
**File:** `packages/core/src/types.ts`

**Add:**
```typescript
export enum Permission {
  RevealWalletAddress = 'reveal_wallet_address',
  RevealExactBalance = 'reveal_exact_balance',
  RevealTokenBalances = 'reveal_token_balances',
  RevealNFTList = 'reveal_nft_list',
  RevealTransactionHistory = 'reveal_transaction_history',
  RevealStakingPositions = 'reveal_staking_positions',
  RevealDeFiPositions = 'reveal_defi_positions',
  SignTransactions = 'sign_transactions',
}

export interface PermissionRequest {
  permissions: Permission[];
  reason?: string;
  duration?: number; // seconds, default 3600
}

export interface Session {
  nullifier: string;
  signature: string;
  verified: boolean;
  permissions: Permission[];
  expiresAt: number;
}
```

### Step 2: Create Permission State Module
**File:** `packages/anchor/programs/veiled/src/state/permission.rs`

**Create:** Copy from `SOLANA_PERMISSIONS.md` lines 9-99

### Step 3: Create Permission Instructions
**Files:**
- `packages/anchor/programs/veiled/src/instructions/grant_permissions.rs`
- `packages/anchor/programs/veiled/src/instructions/revoke_permissions.rs`
- `packages/anchor/programs/veiled/src/instructions/log_permission_access.rs`

**Create:** Copy from `SOLANA_PERMISSIONS.md` lines 103-275

### Step 4: Update Program Lib
**File:** `packages/anchor/programs/veiled/src/lib.rs`

**Add:**
```rust
pub mod state;
pub mod instructions;

use instructions::*;
use state::permission::Permission;

#[program]
pub mod veiled {
    // ... existing verify_auth ...
    
    pub fn grant_permissions(...) -> Result<()> { ... }
    pub fn revoke_permissions(...) -> Result<()> { ... }
    pub fn log_permission_access(...) -> Result<()> { ... }
}
```

---

## Risk Assessment

### High Risk
1. **Timeline:** 3 weeks is aggressive for this scope
   - **Mitigation:** Cut browser extension if behind schedule
   - **Fallback:** Focus on core (circuits + permissions + demo)

2. **SDK Integration Complexity:** Permission system adds significant complexity
   - **Mitigation:** Start with minimal permission modal, iterate
   - **Fallback:** Skip permission modal, use simple approve/deny

### Medium Risk
1. **Circuit Complexity:** Balance range and NFT circuits may be harder than expected
   - **Mitigation:** Start with wallet circuit, validate approach
   - **Fallback:** Use simpler circuits or mock data

2. **RPC Integration:** Helius/Quicknode APIs may have rate limits or quirks
   - **Mitigation:** Abstract RPC layer, add fallbacks
   - **Fallback:** Use mock data for demo

### Low Risk
1. **Browser Extension:** Nice-to-have, can be cut
2. **App Registry:** Optional, can be deferred

---

## Success Criteria

### Minimum Viable (Week 1)
- ✅ 1 circuit works (wallet ownership)
- ✅ Permission system deployed to devnet
- ✅ SDK supports permission requests
- ✅ Basic demo shows difference

### Target (Week 2)
- ✅ All 3 circuits work
- ✅ Permission modal integrated
- ✅ Demo polished
- ✅ Browser extension working

### Stretch (Week 3)
- ✅ 2-3 real integrations
- ✅ Professional documentation
- ✅ All bounties hit

---

## Questions to Resolve

1. **Permission-Circuit Relationship:**
   - Are permissions granted **after** proof verification, or **during**?
   - **Recommendation:** After (permissions are post-auth, circuits are pre-auth)

2. **Session Storage:**
   - Where are sessions stored? (localStorage, IndexedDB, on-chain only?)
   - **Recommendation:** localStorage for UX, on-chain for verification

3. **Permission Expiry:**
   - How do permissions expire? (time-based, session-based, manual?)
   - **Recommendation:** Time-based (as in `SOLANA_PERMISSIONS.md`)

4. **App ID Derivation:**
   - How is `app_id` derived? (domain hash, manual registration?)
   - **Recommendation:** Domain hash (as in `SDK_PERMISSIONS.md`)

---

## Bottom Line

**You have a solid plan, but it's ambitious.** The permission system is a valuable addition that strengthens your hackathon submission, but it adds significant complexity.

**Recommended approach:**
1. **Start with Solana program changes** (Day 1) - blocks everything else
2. **Get wallet circuit working** (Day 2) - proves end-to-end flow
3. **Integrate permissions into SDK** (Day 3) - enables UX
4. **Then iterate** on remaining circuits and polish

**If you fall behind:** Cut browser extension, focus on core functionality.

**Expected outcome:** Working permission system + 3 circuits + demo = strong hackathon submission.

---

**Ready to start?** Begin with Step 1 (SDK types) and Step 2 (Solana permission state).
