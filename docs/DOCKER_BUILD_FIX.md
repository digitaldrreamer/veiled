# Docker Build Fix: Rust Toolchain Version

**Error:** `rustc 1.79.0-dev is not supported by indexmap@2.13.0 requires rustc 1.82`

**Root Cause:** Anchor 0.31.1 Docker image has old Rust toolchain (1.79), but dependencies need 1.82+

**Solution:** Use Anchor 0.32.1 Docker image (has newer Rust toolchain)

---

## ✅ Fix Applied

1. **Updated Cargo.toml** to use Anchor 0.32.1
2. **Updated Anchor.toml** to specify Anchor 0.32.1
3. **Use newer Docker image** for builds

---

## Build Command

```bash
cd ~/Documents/Projects/veiled/packages/anchor

# Use Anchor 0.32.1 Docker image (has rustc 1.82+)
anchor build --verifiable --docker-image solanafoundation/anchor:v0.32.1
```

**OR** if your Anchor CLI doesn't support `--docker-image` flag:

```bash
# Anchor should automatically use 0.32.1 based on Anchor.toml
anchor build --verifiable
```

---

## Why This Works

- **Docker:** No GLIBC issues (container has correct GLIBC)
- **Anchor 0.32.1:** Has newer Rust toolchain (rustc 1.82+) that supports current dependencies
- **Version Match:** Cargo.toml, Anchor.toml, and Docker image all use 0.32.1

---

## Verify It Works

After building:

```bash
# Check build succeeded
ls -la target/deploy/veiled.so

# Check IDL generated
ls -la target/idl/veiled.json

# No errors! ✅
```

---

**This should resolve both the GLIBC issue (via Docker) and the Rust toolchain issue (via 0.32.1)!**
