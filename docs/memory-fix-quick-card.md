# ⚡ MEMORY FIX QUICK CARD - 20 MINUTE SOLUTION
## BPF Memory Optimization Reference | January 26, 2026

---

## THE PROBLEM (In 10 Seconds)

```
BPF Heap: 32KB max
Your code: String + Vec allocations
Result: Memory exceeded → "out of memory" error
```

---

## THE FIX (In 30 Seconds)

| Replace | With | Result |
|---------|------|--------|
| `domain: String` | `domain: &[u8]` | ✅ No allocation |
| `Vec::new()` | `[u8; 512]` | ✅ Stack-based |
| Multiple loads | Single load | ✅ Less memory |

---

## STEP-BY-STEP (20 Minutes)

### 1. Find allocations (5 min)
```bash
grep -rn "String\|Vec<" programs/veiled/src/ | grep -v "//"
```

### 2. Fix String parameter (5 min)
```rust
// Find this:
pub fn verify_auth(instruction_sysvar: &AccountInfo, domain: String)

// Change to:
pub fn verify_auth(instruction_sysvar: &AccountInfo, domain: &[u8])
```

### 3. Fix Vec allocation (5 min)
```rust
// Find this:
let mut message = Vec::new();

// Change to:
const MAX_MSG: usize = 512;
let mut message = [0u8; MAX_MSG];
let mut offset = 0;
```

### 4. Rebuild & test (5 min)
```bash
cd packages/anchor
cargo build-sbf --manifest-path programs/veiled/Cargo.toml --bpf-out-dir programs/veiled/target/deploy
solana program deploy programs/veiled/target/deploy/veiled.so --url http://localhost:8899
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/ed25519_security.ts
```

---

## EXPECTED RESULT

```
7 passing ✅
```

---

## THAT'S IT

No architecture changes. No logic changes. No security changes.

Just memory optimization. Done in 20 minutes.

---

**You've got this.** 💪
