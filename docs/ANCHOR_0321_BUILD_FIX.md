# Fix: Anchor 0.32.1 Build Error - anchor-syn local_file Issue

**Problem:**
```
error[E0599]: no method named `local_file` found for struct `proc_macro::Span`
   --> anchor-syn-0.32.1/src/idl/defined.rs:501:22
```

**Root Cause:**
- `anchor-syn-0.32.1` has a bug where it tries to call `local_file()` on `proc_macro::Span`
- The method doesn't exist in the current Rust toolchain
- This is a known issue in Anchor 0.32.1
- **Catch-22:** Anchor 0.31.1 doesn't have this bug but has Rust 1.79 (too old for indexmap 2.13.0)

**Solution: Patch ALL Anchor Crates from Git (Current Fix)**

To fix the `local_file()` bug while maintaining version consistency, patch ALL anchor crates from the same git source:

### Step 1: Update Cargo.toml Dependencies

```toml
[dependencies]
# Use git dependencies to work around anchor-syn-0.32.1 local_file() bug
anchor-lang = { git = "https://github.com/coral-xyz/anchor", branch = "master", features = ["init-if-needed"] }
anchor-spl = { git = "https://github.com/coral-xyz/anchor", branch = "master" }
```

### Step 2: Patch All Anchor Crates

```toml
[patch.crates-io]
# Patch ALL anchor crates from same git source for version consistency
anchor-syn = { git = "https://github.com/coral-xyz/anchor", branch = "master" }
anchor-lang = { git = "https://github.com/coral-xyz/anchor", branch = "master" }
anchor-spl = { git = "https://github.com/coral-xyz/anchor", branch = "master" }
```

### Step 3: Build with Docker

```bash
cd packages/anchor
rm -rf programs/veiled/target programs/veiled/Cargo.lock
anchor build --verifiable --docker-image solanafoundation/anchor:v0.32.1
```

**Why This Works:**
- Git master branch has the fix for `local_file()` bug
- Patching ALL anchor crates ensures version consistency
- Prevents "deprecated_account_info_usage" and "ConstraintDuplicateMutableAccount" errors

---

## Alternative: Wait for Anchor 0.32.2+ (Future Fix)

This bug will likely be fixed in a future patch version. Monitor:
- https://github.com/coral-xyz/anchor/releases
- https://github.com/coral-xyz/anchor/issues

---

## Why This Happens

- Anchor 0.32.1 Docker image uses Rust 1.90.0 (supports indexmap 2.13.0)
- Anchor 0.31.1 Docker image uses Rust 1.79 (doesn't support indexmap 2.13.0)
- `anchor-syn-0.32.1` has a bug where it incorrectly calls `local_file()` on `proc_macro::Span`
- The method exists on `proc_macro2::Span` but not on `proc_macro::Span`
- This is a code bug in anchor-syn, not a version compatibility issue

---

## Current Status

- ✅ Project configured for Anchor 0.32.1
- ✅ All anchor crates patched from git master (fixes `local_file()` bug)
- ✅ Version consistency maintained (all crates from same git source)
- ⚠️ Using development branch - monitor for official 0.32.2+ release

---

## Note on Stack Overflow Warning

The `regex_automata` stack overflow warning is usually ignorable - it's a known SBF limitation. If it becomes a blocker, consider:
- Reducing regex usage in on-chain code
- Disabling default features that pull in heavy dependencies
