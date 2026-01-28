# Next Steps - Immediate Action Items

**Last Updated:** 2026-01-25  
**Current Status:** MVP ~90% Complete, 1 Critical Blocker Remaining

---

## 🎯 Immediate Priority: Groth16 Verification

### Status
- ✅ **Structure Ready:** Module created, dependencies added
- ✅ **Code Compiles:** All Arkworks dependencies working
- ⏳ **Needs:** Verification key generation + implementation

### Step 1: Generate Verification Key (30 min - 2 hours)

**Option A: Check if Noir.js exposes it**
```typescript
// In packages/core/src/proof/generator.ts
// After initializing Noir, check if verification key is accessible:
const { noir, backend } = await initializeNoir();
// Check: noir.verificationKey, backend.verificationKey, or circuit.verificationKey
```

**Option B: Extract from Barretenberg backend**
```bash
cd packages/circuit
# Check if verification key is in compiled circuit
cat target/veiled_circuit.json | jq '.verification_key'
```

**Option C: Generate separately**
```bash
# Research Noir CLI for verification key generation
nargo --help | grep -i "key\|verify"
# May need to use Barretenberg CLI directly
```

**Option D: Use Noir.js API**
- Check `@noir-lang/backend_barretenberg` documentation
- May need to call backend methods to extract verification key
- Could be available during proof generation

### Step 2: Implement Verification (2-4 hours)

**File:** `packages/anchor/programs/veiled/src/groth16.rs`

1. **Uncomment and implement the verification logic** (already documented in code)
2. **Add verification key loading:**
   ```rust
   // Option 1: Compile-time constant
   const VERIFICATION_KEY: &[u8] = include_bytes!("../verification_key.bin");
   
   // Option 2: Pass as instruction parameter
   // Update verify_auth to accept verification_key: Vec<u8>
   ```

3. **Test compilation:**
   ```bash
   cd packages/anchor
   bun run check
   ```

### Step 3: Test End-to-End (1-2 hours)

1. **Generate proof in demo app**
2. **Submit to Anchor program**
3. **Verify transaction succeeds**
4. **Test with invalid proof (should fail)**

---

## 📋 Quick Wins (If Groth16 is Blocked)

If verification key generation is taking too long, work on these:

### 1. **End-to-End Testing** (1 hour)
- Test full flow: wallet connect → proof generation → submission
- Fix any bugs found
- Improve error messages

### 2. **Error Handling** (1-2 hours)
- Add better error messages for on-chain failures
- Add retry logic for network issues
- Add user-friendly error display in demo

### 3. **UI Polish** (1-2 hours)
- Add loading states during proof generation
- Show progress indicators
- Improve transaction status display

### 4. **Documentation** (1 hour)
- Update README with current status
- Document known limitations
- Add setup instructions

---

## 🚀 Post-Groth16: MVP Completion Checklist

Once Groth16 verification is working:

- [ ] **Deploy to Devnet**
  ```bash
  cd packages/anchor
  anchor build
  anchor deploy --provider.cluster devnet
  ```

- [ ] **Update Demo App**
  - Point to devnet program
  - Test with real wallet
  - Verify end-to-end flow

- [ ] **Final Testing**
  - Test with multiple wallets
  - Test nullifier reuse (should fail)
  - Test session verification
  - Test error cases

- [ ] **Documentation**
  - Update API docs
  - Add deployment guide
  - Create demo video

---

## 🔍 Research Tasks (Parallel Work)

While working on Groth16, research:

1. **Verification Key Format**
   - What format does Barretenberg use?
   - How to convert to Arkworks format?
   - Can we use Noir.js to extract it?

2. **Noir.js API**
   - Check `@noir-lang/backend_barretenberg` source
   - Look for verification key access methods
   - Check if it's in the circuit object

3. **Alternative Approaches**
   - Can we verify proofs off-chain first?
   - Is there a Solana program that does Groth16 verification?
   - Can we use a different proof system temporarily?

---

## 📊 Current Status Summary

### ✅ Completed (90%)
- Circuit compilation ✅
- Proof generation ✅
- Wallet integration ✅
- On-chain submission ✅
- Nullifier replay protection ✅
- Session verification ✅
- Groth16 structure ✅

### ⏳ Remaining (10%)
- Groth16 verification implementation
- Verification key generation
- End-to-end testing with real verification

---

## 🎯 Recommended Order

1. **First:** Generate verification key (30 min - 2 hours)
2. **Second:** Implement verification (2-4 hours)
3. **Third:** Test end-to-end (1-2 hours)
4. **Fourth:** Deploy to devnet (30 min)
5. **Fifth:** Final polish (1-2 hours)

**Total Estimated Time:** 5-11 hours

---

## 💡 Tips

- **If stuck on verification key:** Check Noir.js source code or Barretenberg docs
- **If Arkworks doesn't work:** Research alternative Groth16 libraries
- **For MVP demo:** Can show proof generation working, note verification is pending
- **Document limitations:** Be clear about what's working vs. what's placeholder

---

## 📞 Resources

- **Noir Documentation:** https://noir-lang.org/docs/
- **Arkworks Groth16:** https://github.com/arkworks-rs/groth16
- **Barretenberg:** https://github.com/AztecProtocol/barretenberg
- **Implementation Guide:** `packages/anchor/GROTH16_VERIFICATION.md`
- **Research Notes:** `docs/GROTH16_RESEARCH.md`
