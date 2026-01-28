# Remaining Tasks & Placeholders

**Last Updated:** 2026-01-25  
**Status:** MVP Core Complete, Enhancements Pending

---

## 🎯 MVP Status Overview

### ✅ **COMPLETED (MVP Core)**
- ✅ Noir circuit compilation and testing
- ✅ Wallet adapter integration (Phantom)
- ✅ Proof generation in browser (Noir WASM)
- ✅ Anchor program structure
- ✅ On-chain proof submission wiring
- ✅ Basic demo app with wallet connection
- ✅ IDL integration for program client

### ⏳ **TODO (MVP Critical Path)**

#### **1. Circuit Improvements** (`packages/circuit/src/main.nr`)
- [ ] **Replace SHA256 with Poseidon hash** (when available in Noir stdlib)
  - Currently using `std::hash::sha256` as placeholder
  - Poseidon is more ZK-friendly (smaller proofs)
  - Lines 46, 54: `// TODO: Replace with Poseidon hash once available`

#### **2. Anchor Program** (`packages/anchor/programs/veiled/src/lib.rs`)
- [ ] **Groth16 Proof Verification** (Lines 4, 27)
  - Currently accepts proof without verification
  - Need to integrate Groth16 verifier
  - Critical for security - proofs must be verified on-chain
  
- [ ] **Nullifier Replay Protection** (Line 28)
  - Currently doesn't check if nullifier already used
  - Should check PDA account exists before creating
  - Critical for preventing double-spending
  
- [ ] **PDA Account Implementation** (Lines 5, 29, 51)
  - Currently uses `init` which creates new account each time
  - Should use PDA with `init_if_needed` or check existence
  - Already has seeds defined, just needs proper logic

- [ ] **Account Fields** (Line 73)
  - Add expiry timestamp
  - Add commitment field
  - Add metadata for future features

#### **3. SDK Core** (`packages/core/src/veiled-auth.ts`)
- [ ] **Signature Verification in Circuit** (Line 53)
  - Currently extracts secret key from signature (placeholder)
  - Should update circuit to verify Ed25519 signature directly
  - More secure - doesn't require secret key material
  
- [ ] **Session Verification** (Line 99)
  - Currently returns `{ valid: true }` placeholder
  - Should query on-chain nullifier registry
  - Should check expiry timestamps
  - Should verify commitment matches
  
- [ ] **Session Expiry/Revocation** (Line 104)
  - Currently empty implementation
  - Should support session expiry
  - Should support manual revocation

#### **4. Wallet Adapter** (`packages/core/src/wallet/adapter.ts`)
- [ ] **Direct Signature Verification** (Lines 4, 63)
  - Currently uses placeholder secret key extraction
  - Should update circuit to verify signature directly
  - More secure and wallet-friendly

---

## 🔧 **"For Now" Placeholders**

### **1. Circuit Hash Function** (`packages/circuit/src/main.nr`)
- **Current:** Using SHA256 (`std::hash::sha256`)
- **Reason:** Poseidon not available in Noir stdlib yet
- **Impact:** Larger proof sizes, but functional
- **Action:** Monitor Noir stdlib updates, switch when available

### **2. Secret Key Extraction** (`packages/core/src/wallet/adapter.ts`)
- **Current:** `signature.slice(0, 32)` - first 32 bytes of signature
- **Reason:** Circuit expects secret key, but wallets don't expose it
- **Impact:** Not cryptographically sound - needs circuit update
- **Action:** Update circuit to verify Ed25519 signature directly

### **3. Anchor Proof Verification** (`packages/anchor/programs/veiled/src/lib.rs`)
- **Current:** Accepts proof without verification
- **Reason:** Groth16 verifier integration pending
- **Impact:** **CRITICAL SECURITY ISSUE** - anyone can submit fake proofs
- **Action:** Integrate Groth16 verifier library (e.g., `arkworks` or `bellman`)

### **4. Nullifier Registry** (`packages/anchor/programs/veiled/src/lib.rs`)
- **Current:** Uses `init` which allows duplicate nullifiers
- **Reason:** PDA logic needs proper existence check
- **Impact:** Users can reuse nullifiers (replay attack)
- **Action:** Change to `init_if_needed` or check account existence first

### **5. Session Verification** (`packages/core/src/veiled-auth.ts`)
- **Current:** Always returns `{ valid: true }`
- **Reason:** On-chain query not implemented
- **Impact:** Can't verify if session is actually valid
- **Action:** Query nullifier PDA account on-chain

### **6. RPC Provider** (`apps/demo/src/routes/+page.svelte`)
- **Current:** RPC provider selector is placeholder
- **Reason:** NFT/balance fetching not implemented
- **Impact:** UI shows option but doesn't use it
- **Action:** Implement Helius/Quicknode NFT/balance APIs

---

## 📋 **MVP vs Post-MVP Features**

### **MVP (Must Have for Hackathon)**

#### **Critical Security Fixes (MUST DO)**
1. **Groth16 Proof Verification** ⚠️ **BLOCKER**
   - Without this, anyone can fake proofs
   - Priority: **CRITICAL**
   - Estimated: 1-2 days

2. **Nullifier Replay Protection** ⚠️ **BLOCKER**
   - Without this, users can reuse nullifiers
   - Priority: **CRITICAL**
   - Estimated: 2-4 hours

3. **Session Verification** ⚠️ **HIGH**
   - Without this, can't verify sessions are valid
   - Priority: **HIGH**
   - Estimated: 4-6 hours

#### **Nice-to-Have (If Time Permits)**
- [ ] Signature verification in circuit (instead of secret key)
- [ ] Session expiry/revocation
- [ ] Poseidon hash (when available)
- [ ] Account expiry fields

### **Post-MVP (After Hackathon)**

#### **Week 4 Features**
- [ ] NFT ownership circuit
- [ ] Balance range circuit
- [ ] Multi-RPC support (Helius, Quicknode)
- [ ] Framework integrations (React, Svelte wrappers)
- [ ] Comparison mode in demo

#### **Post-Hackathon**
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Production monitoring
- [ ] Advanced selective disclosure
- [ ] Social graph integration

---

## 🚨 **Critical Path (Must Fix Before Demo)**

### **Priority 1: Security (BLOCKERS)**
1. **Groth16 Proof Verification** - 1-2 days
   - Research Groth16 verifier libraries for Solana
   - Integrate into Anchor program
   - Test with real proofs

2. **Nullifier Replay Protection** - 2-4 hours
   - Change `init` to `init_if_needed`
   - Add existence check before creating account
   - Test duplicate nullifier rejection

### **Priority 2: Functionality (HIGH)**
3. **Session Verification** - 4-6 hours
   - Implement `verifyNullifierOnChain()` call
   - Check account existence and expiry
   - Return proper validation result

### **Priority 3: Polish (NICE-TO-HAVE)**
4. **Signature Verification in Circuit** - 1-2 days
   - Update circuit to verify Ed25519 signature
   - Remove secret key extraction
   - More secure and wallet-friendly

---

## 📊 **Completion Status**

### **MVP Core: 85% Complete**
- ✅ Circuit: 90% (needs Poseidon, signature verification)
- ✅ Anchor: 60% (needs Groth16, replay protection)
- ✅ SDK: 80% (needs session verification)
- ✅ Demo: 90% (needs RPC integration)

### **Critical Blockers: 2**
1. Groth16 proof verification
2. Nullifier replay protection

### **Estimated Time to MVP: 2-3 days**
- Day 1: Groth16 integration
- Day 2: Replay protection + session verification
- Day 3: Testing + polish

---

## 🎯 **Recommended Next Steps**

1. **Fix Security Blockers First**
   - Start with Groth16 verification (biggest blocker)
   - Then nullifier replay protection
   - Test thoroughly

2. **Add Session Verification**
   - Implement on-chain queries
   - Add expiry checking
   - Update demo to show validation

3. **Polish & Test**
   - End-to-end testing
   - Error handling improvements
   - UI polish

4. **Post-MVP Features** (if time)
   - NFT/balance circuits
   - Multi-RPC support
   - Framework integrations

---

## 📝 **Notes**

- **"For now" placeholders** are temporary implementations that work but need improvement
- **TODOs** are explicit tasks that need to be completed
- **MVP critical path** items must be done before demo
- **Post-MVP** items can wait until after hackathon

**Current State:** Core functionality works, but security features need completion before production use.
