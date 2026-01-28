# Quick Fix: Build Anchor from Source

**Problem:** AVM's precompiled Anchor binaries require GLIBC 2.39, your system has 2.35

**Solution:** Build Anchor CLI from source (links against your GLIBC)

---

## Quick Commands (Copy & Paste)

```bash
# 1. Ensure Rust is installed
rustc --version || curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh && source ~/.cargo/env

# 2. Build Anchor CLI from source (takes 5-10 min)
cargo install --locked --version 0.31.1 anchor-cli

# 3. Add Cargo bin to PATH (if not already)
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 4. Verify it works
which anchor
anchor --version

# 5. Build your program
cd ~/Documents/Projects/veiled/packages/anchor
anchor build
```

---

## Why This Works

- **AVM binaries**: Precompiled on newer system → need GLIBC 2.39 ❌
- **Cargo build**: Compiled on YOUR system → uses YOUR GLIBC 2.35 ✅

---

## If You Need Anchor 0.32.1

```bash
cargo install --locked --version 0.32.1 anchor-cli
```

Both versions work - choose based on your project's needs.

---

**Done!** The `anchor` command will now use the locally-built binary that works with your GLIBC.
