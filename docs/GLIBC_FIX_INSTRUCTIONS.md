# GLIBC Fix: Run These Commands in Your Terminal

**Issue:** Anchor 0.32.1 requires GLIBC 2.39, but your system has GLIBC 2.35

**Solution:** Anchor 0.31.1 is already installed! Just use it directly.

---

## Quick Fix (Run in Your Terminal)

### Step 1: Use Anchor 0.31.1 Directly

```bash
cd ~/Documents/Projects/veiled/packages/anchor

# Use the 0.31.1 binary directly (bypasses AVM symlink)
~/.avm/bin/anchor-0.31.1 build
```

### Step 2: Run Tests

```bash
# Still in packages/anchor directory
~/.avm/bin/anchor-0.31.1 test
```

---

## Alternative: Make AVM Use 0.31.1 Permanently

If you want `anchor` command to always use 0.31.1:

```bash
# Set AVM to use 0.31.1
~/.avm/bin/avm use 0.31.1

# Verify it worked (in a NEW terminal, not Cursor's terminal)
anchor --version
# Should show: 0.31.1

# Then you can use anchor normally
cd ~/Documents/Projects/veiled/packages/anchor
anchor build
anchor test
```

**Note:** The `avm use` command may not work in Cursor's integrated terminal due to how it handles environment variables. Use the direct binary path (`~/.avm/bin/anchor-0.31.1`) or open a regular terminal.

---

## Verify It Works

After building:

```bash
# Check if build succeeded
ls -la target/deploy/veiled.so
# Should exist and have recent timestamp

# Check if IDL was generated
ls -la target/idl/veiled.json
# Should exist
```

---

## Expected Output

When you run `~/.avm/bin/anchor-0.31.1 build`, you should see:

```
Building...
Compiling veiled v0.1.0
Finished release [optimized] target(s) in X.XXs
```

No GLIBC errors! ✅

---

## If You Still Get GLIBC Errors

If even 0.31.1 gives GLIBC errors, try:

1. **Check the binary's GLIBC requirement:**
   ```bash
   strings ~/.avm/bin/anchor-0.31.1 | grep GLIBC | tail -1
   ```

2. **Use Docker instead:**
   ```bash
   cd ~/Documents/Projects/veiled/packages/anchor
   anchor build --verifiable
   anchor test --docker
   ```

---

**Next:** Once build succeeds, run the permission tests!
