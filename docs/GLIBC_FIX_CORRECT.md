# GLIBC Fix: Build Anchor from Source

**Issue:** Precompiled Anchor binaries from AVM require GLIBC 2.39, but your system has GLIBC 2.35

**Root Cause:** The `anchor-0.32.1` and `anchor-0.31.1` binaries in `~/.avm/bin` were built on a system with newer GLIBC than yours.

**Solution:** Build Anchor CLI from source using Cargo (will link against your system's GLIBC)

---

## ✅ Correct Solution: Build from Source

### Step 1: Verify GLIBC Version

```bash
ldd --version
# Should show: GLIBC 2.35 (or similar)
```

### Step 2: Ensure Rust is Installed

```bash
# Check if Rust is installed
rustc --version

# If not installed:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### Step 3: Build Anchor CLI from Source

```bash
# Install Anchor CLI 0.31.1 (or 0.32.1) from source
cargo install --locked --version 0.31.1 anchor-cli

# This will:
# - Build anchor-cli from source
# - Link against YOUR system's GLIBC (2.35)
# - Place binary in ~/.cargo/bin/anchor
```

**Note:** Building from source takes 5-10 minutes, but it's a one-time operation.

### Step 4: Update PATH (Put Cargo Before AVM)

Add to your `~/.zshrc` (or `~/.bashrc`):

```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

Then reload:

```bash
source ~/.zshrc  # or ~/.bashrc
```

### Step 5: Verify

```bash
which anchor
# Should show: /home/digitaldrreamer/.cargo/bin/anchor

anchor --version
# Should show: anchor-cli 0.31.1 (or 0.32.1)
```

### Step 6: Build and Test

```bash
cd ~/Documents/Projects/veiled/packages/anchor
anchor build
anchor test
```

**No GLIBC errors!** ✅

---

## Why This Works

- **Precompiled binaries** (from AVM): Built on newer system → require GLIBC 2.39
- **Source build** (via Cargo): Built on YOUR system → links against YOUR GLIBC (2.35)
- **Result:** Binary runs on your system without GLIBC errors

---

## Alternative: Use Docker (If You Prefer)

If you don't want to build from source:

```bash
cd ~/Documents/Projects/veiled/packages/anchor
anchor build --verifiable
anchor test --docker
```

This uses Docker container with newer GLIBC, but requires Docker setup.

---

## Verification Commands

After building from source:

```bash
# Check which anchor is used
which anchor
# Should be: ~/.cargo/bin/anchor

# Check version
anchor --version

# Check GLIBC requirement of the binary
ldd ~/.cargo/bin/anchor | grep libc
# Should show your system's libc (2.35)

# Build
anchor build
# Should succeed without GLIBC errors
```

---

## Troubleshooting

### If `cargo install` fails:

```bash
# Update Rust toolchain
rustup update stable

# Try again
cargo install --locked --version 0.31.1 anchor-cli
```

### If PATH doesn't work:

```bash
# Check current PATH
echo $PATH

# Manually add Cargo bin
export PATH="$HOME/.cargo/bin:$PATH"

# Verify
which anchor
```

### If build still fails:

Check that you have required system dependencies:

```bash
# Ubuntu/Debian
sudo apt-get install build-essential pkg-config libssl-dev
```

---

**This is the correct solution - building from source ensures compatibility with your system's GLIBC!** 🎯
