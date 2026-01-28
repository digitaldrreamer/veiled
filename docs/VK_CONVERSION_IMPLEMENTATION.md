# Verification Key Conversion Implementation Plan

**Based on Research:** `groth16-vk-research.md`, `quick-reference.md`, `implementation-roadmap.md`  
**Status:** Ready to implement  
**Timeline:** 2-3 days

---

## Key Findings from Research

1. **Barretenberg outputs UltraHonk by default** (not Groth16)
2. **Binary format is incompatible** (bit flags are opposite)
3. **Solution: JSON-based VK conversion** (recommended approach)

---

## Implementation Steps

### Phase 1: Diagnosis (TODAY)
- [x] Research complete (3 MD files added)
- [ ] Run diagnostic script to confirm proof type
- [ ] Check VK format (binary vs JSON)

### Phase 2: Update TypeScript SDK
- [ ] Modify `exportVerificationKey()` to output JSON format
- [ ] Add VK format detection
- [ ] Export as JSON if possible

### Phase 3: Create Rust Conversion Module
- [ ] Create `packages/anchor/programs/veiled/src/vk_conversion.rs`
- [ ] Implement `hex_to_fr()` and `hex_to_fq()` functions
- [ ] Implement `convert_barretenberg_vk_to_arkworks()`
- [ ] Add proper error types

### Phase 4: Update Groth16 Verification
- [ ] Update `groth16.rs` to use JSON-based VK
- [ ] Replace binary deserialization with JSON parsing
- [ ] Integrate conversion function
- [ ] Update error handling

### Phase 5: Testing
- [ ] Generate VK as JSON
- [ ] Test conversion in Rust
- [ ] Test end-to-end verification
- [ ] Remove security fallbacks

---

## Next Actions

1. **Run diagnostic script** to confirm what we're actually generating
2. **Update TypeScript** to export VK as JSON
3. **Implement Rust conversion** module
4. **Update verification** to use converted VK
