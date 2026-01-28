# Fix: Anchor Version Mismatch

**Problem:** 
- `anchor --version` shows `0.31.1` (Cargo-installed)
- Project needs `0.32.1` (Cargo.toml, Anchor.toml)
- `anchor build --verifiable` tries to use `~/.avm/bin/anchor-0.32.1` (GLIBC error)

**Solution:** Install Anchor 0.32.1 via Cargo to match project version

---

## Quick Fix

```bash
# Install Anchor 0.32.1 via Cargo (matches your project)
cargo install --locked --version 0.32.1 anchor-cli --force

# Reload PATH
hash -r

# Verify version
anchor --version
# Should show: anchor-cli 0.32.1

# Now build
cd ~/Documents/Projects/veiled/packages/anchor
anchor build --verifiable --docker-image solanafoundation/anchor:v0.32.1
```

---

## If `--docker-image` Flag Doesn't Work

If your Anchor CLI doesn't support `--docker-image`, Anchor should automatically use the version from `Anchor.toml`:

```bash
# Just run (uses version from Anchor.toml)
anchor build --verifiable
```

Your `Anchor.toml` already has:
```toml
[toolchain]
anchor_version = "0.32.1"
```

So it should use `solanafoundation/anchor:v0.32.1` automatically.

---

## Verify Everything is Correct

```bash
# Check which anchor is used
which anchor
# Should show: /home/digitaldrreamer/.cargo/bin/anchor

# Check version
anchor --version
# Should show: anchor-cli 0.32.1

# Check Anchor.toml version
grep anchor_version Anchor.toml
# Should show: anchor_version = "0.32.1"
```

---

## Why This Works

1. **Cargo-installed Anchor 0.32.1**: Works on your host (built from source, uses your GLIBC)
2. **Matches project version**: Cargo.toml, Anchor.toml, and CLI all use 0.32.1
3. **Docker build**: Program compilation happens in container (no GLIBC issues)
4. **No AVM conflicts**: Cargo bin is first in PATH, so AVM binaries aren't called

---

**After installing 0.32.1, the build should work!** ✅
