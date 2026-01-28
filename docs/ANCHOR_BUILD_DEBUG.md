# Debug: __client_accounts_instructions Error

**Error:** `could not find '__client_accounts_instructions' in the crate root`

**Status:** Still occurring even with `anchor build`

---

## What We've Tried

1. ✅ Downgraded anchor-lang to 0.31.1 (matches CLI)
2. ✅ Added `idl-build` to default features
3. ✅ Set `anchor_version = "0.31.1"` in Anchor.toml
4. ⚠️ Still getting the error

---

## Possible Causes

### 1. Anchor 0.31.1 Code Generation Issue

Anchor 0.31.1 might generate `__client_accounts_instructions` differently, or there might be a bug.

**Check:** Does `anchor build` actually generate the code?

```bash
cd packages/anchor
anchor build --verbose 2>&1 | grep -i "client\|instruction\|generate"
```

### 2. Feature Flag Issue

The `idl-build` feature might need to be explicitly enabled during build.

**Try:**
```bash
cd packages/anchor/programs/veiled
cargo build --features idl-build
```

### 3. Stale Build Artifacts

Even with `anchor build`, there might be cached artifacts causing issues.

**Try:**
```bash
cd packages/anchor
rm -rf target/
anchor clean  # If available
anchor build
```

### 4. Anchor Version Compatibility

Anchor 0.31.1 might have a known bug with this. Check if upgrading to 0.32.1 (via Docker) fixes it.

---

## Next Steps to Debug

### Step 1: Verify Anchor Build Process

```bash
cd packages/anchor

# Check what anchor build actually does
anchor build --help

# Run with verbose output
anchor build -v 2>&1 | tee build.log

# Check if IDL is generated
ls -la target/idl/veiled.json
```

### Step 2: Check Generated Code

```bash
# Look for generated code in target/
find target/ -name "*client*" -o -name "*instruction*" 2>/dev/null

# Check if Anchor generated any helper files
ls -la target/deploy/
ls -la target/idl/
```

### Step 3: Try Building with Cargo Directly (with feature)

```bash
cd packages/anchor/programs/veiled

# Build with idl-build feature explicitly
~/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin/cargo build --features idl-build
```

### Step 4: Check Anchor Version Compatibility

```bash
# Verify Anchor CLI version
anchor --version

# Check if there are known issues with 0.31.1
# Search: "anchor 0.31.1 __client_accounts_instructions"
```

---

## Alternative: Use Anchor 0.32.1 via Docker

If 0.31.1 has a bug, use 0.32.1 in Docker:

```bash
cd packages/anchor
anchor build --verifiable
```

This uses Docker with Anchor 0.32.1, which might not have this issue.

---

## Expected Behavior

When `anchor build` works correctly, it should:
1. Generate IDL: `target/idl/veiled.json`
2. Generate TypeScript types: `target/types/veiled.ts`
3. Generate Rust helper code (including `__client_accounts_instructions`)
4. Compile the program: `target/deploy/veiled.so`

If any of these are missing, that's the issue.

---

**Run the debug steps above and share the output!**
