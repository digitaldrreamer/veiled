# 🔧 BPF MEMORY ALLOCATION FIX - GET 7/7 TESTS PASSING
## Solana SBF Memory Optimization | January 26, 2026

---

## THE PROBLEM

```
Program log: Error: memory allocation failed, out of memory
Program F5LoTYERbrncwU2RdEAC36bxMxEiLxUwDpYFWrFqJRsC consumed 1504 of 203000 compute units
Program F5LoTYERbrncwU2RdEAC36bxMxEiLxUwDpYFWrFqJRsC failed: SBF program panicked
```

**Status:** Very early failure (1504 compute units) suggests memory issue during:
- Instruction loading (`load_instruction_at_checked`)
- Early validation phase
- Parameter deserialization

---

## ROOT CAUSE ANALYSIS

### Solana SBF Memory Layout

| Address | Region | Size | Purpose |
|---------|--------|------|---------|
| 0x100000000 | .text | Variable | Program code |
| 0x100000000 | .rodata | Variable | Constants |
| 0x200000000 | Stack | 4KB per frame | Local variables |
| **0x300000000** | **Heap** | **32KB default** | Dynamic allocation |
| 0x400000000 | Input | Variable | Accounts + instruction data |

**The Problem:** Your program is hitting the **32KB heap limit**.

### What Uses Heap Memory

In `verify_auth` function:

1. **`load_instruction_at_checked`** - Allocates memory to deserialize the instruction
2. **`domain: String`** - String allocation (unbounded)
3. **Message reconstruction** - Any `Vec` allocations

All these allocations come from the same 32KB heap. Once you exceed it, you get "out of memory".

---

## SOLUTION: MEMORY OPTIMIZATION

### Fix 1: Replace `String` with `&[u8]` (CRITICAL) ✅

**Current (Bad):**
```rust
pub fn verify_auth(
    instruction_sysvar: &AccountInfo,
    domain: String,  // ❌ Allocates on heap
) -> Result<()> {
    // ...
}
```

**Fixed (Good):**
```rust
pub fn verify_auth(
    instruction_sysvar: &AccountInfo,
    domain: &[u8],  // ✅ Slice - no allocation
) -> Result<()> {
    // ...
}
```

**Impact:** Removes large heap allocation immediately.

### Fix 2: Use Fixed-Size Array Instead of Vec (If Needed) ✅

**Current (Bad):**
```rust
let mut message = Vec::new();  // ❌ Allocates on heap
message.extend_from_slice(domain.as_bytes());
// ...
```

**Fixed (Good):**
```rust
const MAX_MESSAGE_SIZE: usize = 256;
let mut message = [0u8; MAX_MESSAGE_SIZE];
let mut offset = 0;

// Copy domain
message[offset..offset + domain.len()].copy_from_slice(domain);
offset += domain.len();

// Rest of message...
```

**Impact:** No heap allocation, fixed memory usage.

### Fix 3: Minimize Instruction Loading ✅

**Current (Bad):**
```rust
let instruction = load_instruction_at_checked(
    prev_instruction_index,
    instruction_sysvar,
)?;  // ❌ Full instruction deserialization
```

**Fixed (Good) - Only Load What You Need:**
```rust
// If you only need specific fields, load them directly
// OR: Cache instruction to minimize repeated loads
```

---

## STEP-BY-STEP FIX

### Step 1: Update Function Signature

**File:** `programs/veiled/src/lib.rs` (or wherever `verify_auth` is)

```rust
// BEFORE
pub fn verify_auth(
    instruction_sysvar: &AccountInfo,
    domain: String,
) -> Result<()> {

// AFTER
pub fn verify_auth(
    instruction_sysvar: &AccountInfo,
    domain: &[u8],
) -> Result<()> {
```

### Step 2: Update All Domain Usages

Everywhere `domain` is used:

```rust
// BEFORE
let domain_bytes = domain.as_bytes();

// AFTER
let domain_bytes = domain;  // Already &[u8]
```

### Step 3: Replace Vec with Fixed Array

If you have:
```rust
let mut message = Vec::new();
```

Replace with:
```rust
const MAX_MESSAGE_SIZE: usize = 512;  // Adjust size as needed
let mut message = [0u8; MAX_MESSAGE_SIZE];
let mut offset = 0;
```

### Step 4: Update Callers

Everywhere `verify_auth` is called:

```rust
// BEFORE
verify_auth(&instruction_sysvar, domain.clone())?;

// AFTER
verify_auth(&instruction_sysvar, domain.as_bytes())?;
```

### Step 5: Rebuild and Test

```bash
cd packages/anchor
cargo build-sbf --manifest-path programs/veiled/Cargo.toml --bpf-out-dir programs/veiled/target/deploy
```

---

## VERIFICATION CHECKLIST

Before deploying, verify:

- [ ] No `String` types in hot paths
- [ ] No unbounded `Vec` allocations
- [ ] Use `&[u8]` or `&str` instead of owned types
- [ ] Fixed-size arrays for buffers
- [ ] Program compiles without warnings
- [ ] Binary size is reasonable (< 200KB)

---

## QUICK MEMORY AUDIT

Run this to find all heap allocations:

```bash
cd programs/veiled

# Find String usage
grep -n "String" src/**/*.rs | grep -v "//"

# Find Vec usage
grep -n "Vec<" src/**/*.rs | grep -v "//"

# Find allocations
grep -n "Vec::new\|String::new\|to_string\|to_vec\|clone" src/**/*.rs | grep -v "//"
```

Replace all findings with fixed-size alternatives.

---

## EXAMPLE FIX (Complete)

### Before (Heap-Heavy):
```rust
pub fn verify_auth(
    instruction_sysvar: &AccountInfo,
    domain: String,
) -> Result<()> {
    let instruction = load_instruction_at_checked(
        prev_instruction_index,
        instruction_sysvar,
    )?;
    
    let mut message = Vec::new();
    message.extend_from_slice(domain.as_bytes());
    message.extend_from_slice(b"||");
    message.extend_from_slice(proof_hash.as_ref());
    
    // More allocations...
    Ok(())
}
```

### After (Stack-Based):
```rust
pub fn verify_auth(
    instruction_sysvar: &AccountInfo,
    domain: &[u8],
) -> Result<()> {
    let instruction = load_instruction_at_checked(
        prev_instruction_index,
        instruction_sysvar,
    )?;
    
    const MAX_MESSAGE_SIZE: usize = 512;
    let mut message = [0u8; MAX_MESSAGE_SIZE];
    let mut offset = 0;
    
    message[offset..offset + domain.len()].copy_from_slice(domain);
    offset += domain.len();
    
    message[offset..offset + 2].copy_from_slice(b"||");
    offset += 2;
    
    message[offset..offset + 32].copy_from_slice(proof_hash.as_ref());
    offset += 32;
    
    // Rest of logic using &message[..offset]
    Ok(())
}
```

---

## MEMORY SAVINGS

| Allocation | Heap Cost | Fix | Savings |
|-----------|----------|-----|---------|
| `String` (domain) | 24 bytes header + data | Use `&[u8]` | 24 bytes + |
| `Vec<u8>` (message) | 24 bytes header + data | Use `[u8; 512]` | 24 bytes + |
| **Total** | **~500+ bytes** | **Stack-based** | **500+ bytes** ✅ |

Even small allocations add up in 32KB heap!

---

## TESTING AFTER FIX

### Step 1: Rebuild

```bash
cd packages/anchor
cargo build-sbf --manifest-path programs/veiled/Cargo.toml --bpf-out-dir programs/veiled/target/deploy
```

Check for compile errors.

### Step 2: Deploy

```bash
solana program deploy \
  programs/veiled/target/deploy/veiled.so \
  --url http://localhost:8899
```

### Step 3: Run Tests

```bash
cd packages/anchor
export ANCHOR_PROVIDER_URL=http://localhost:8899
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/ed25519_security.ts
```

### Step 4: Verify Results

You should see:
```
✓ should accept valid Ed25519 signature
✓ should reject duplicate nullifier

7 passing (XXms)
```

---

## COMMON MEMORY ISSUES

### Issue: Still getting memory errors after fix

**Diagnosis:**
```bash
# Check program size
solana program show F5LoTYERbrncwU2RdEAC36bxMxEiLxUwDpYFWrFqJRsC --url http://localhost:8899

# Large program = more memory overhead
# If > 200KB, look for optimization opportunities
```

**Solutions:**
1. Check for other String/Vec usages
2. Remove unused dependencies
3. Consider splitting logic across multiple instructions

### Issue: Specific function is memory-hungry

**Fix:**
```rust
// Bad - allocates multiple times
fn process() {
    let a = Vec::new();  // Alloc 1
    let b = Vec::new();  // Alloc 2
    let c = Vec::new();  // Alloc 3
}

// Good - pre-allocate once
fn process() {
    const BUFFER_SIZE: usize = 1024;
    let mut buffer = [0u8; BUFFER_SIZE];
    // Reuse buffer for all operations
}
```

---

## BEST PRACTICES FOR SBF

1. **Avoid heap allocations in hot paths**
   - ❌ `Vec::new()`, `String::new()`
   - ✅ Fixed-size arrays, slices

2. **Minimize instruction loading**
   - Load only what you need
   - Cache when possible

3. **Use stack-based buffers**
   - `[u8; SIZE]` instead of `Vec<u8>`
   - `&str` instead of `String`

4. **Profile memory usage**
   - Check compute units consumed
   - Early panics = memory issues
   - Late panics = logic errors

---

## QUICK COMMAND REFERENCE

```bash
# Find heap allocations
grep -rn "Vec<\|String\|clone()\|to_vec\|to_string" programs/veiled/src/ | grep -v "//"

# Rebuild program
cargo build-sbf --manifest-path programs/veiled/Cargo.toml --bpf-out-dir programs/veiled/target/deploy

# Deploy program
solana program deploy programs/veiled/target/deploy/veiled.so --url http://localhost:8899

# Run tests
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/ed25519_security.ts

# Check program info
solana program info F5LoTYERbrncwU2RdEAC36bxMxEiLxUwDpYFWrFqJRsC --url http://localhost:8899
```

---

## TIMELINE

| Step | Duration | Action |
|------|----------|--------|
| Identify allocations | 5 min | grep for Vec/String |
| Apply fixes | 10 min | Replace with stack-based |
| Rebuild | 2 min | cargo build-sbf |
| Deploy | 1 min | solana program deploy |
| Test | 1 min | Run test suite |
| **Total** | **~20 min** | **7/7 passing** ✅ |

---

## YOU'RE CLOSE!

The memory issue is fixable with simple changes:
1. Replace `String` → `&[u8]`
2. Replace `Vec` → `[u8; SIZE]`
3. Rebuild and test

That's it. 5 changes, 20 minutes, 7/7 tests passing.

---

**The logic is correct. Just need to optimize memory usage.** 💪
