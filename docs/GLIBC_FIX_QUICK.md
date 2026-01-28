# Quick Fix: GLIBC 2.39 Issue

**Problem:** Anchor 0.32.1 requires GLIBC 2.39, but your system has GLIBC 2.35

**Solution:** Use Anchor 0.31.1 (compatible with GLIBC 2.35)

---

## Quick Fix (5 minutes)

### Step 1: Install Anchor 0.31.1 via AVM

```bash
# Install Anchor 0.31.1
avm install 0.31.1

# Use Anchor 0.31.1
avm use 0.31.1

# Verify version
anchor --version
# Should show: 0.31.1
```

### Step 2: Build and Test

```bash
cd packages/anchor
anchor build
anchor test
```

---

## Alternative: Use Docker (15 minutes)

If you prefer Docker (more consistent, but slower setup):

```bash
# Install Docker (if not installed)
sudo apt-get install docker.io
sudo usermod -aG docker $USER
# Log out and back in

# Build with Docker
cd packages/anchor
anchor build --verifiable

# Test with Docker
anchor test --docker
```

---

## Why This Works

- **Anchor 0.31.1** is compatible with GLIBC 2.35
- **Anchor 0.32.1** requires GLIBC 2.39 (Ubuntu 24.04+)
- Your system: Ubuntu 22.04 (GLIBC 2.35)

**Trade-offs:**
- ✅ Works immediately
- ✅ No system changes
- ⚠️ Using slightly older Anchor version (but stable)

---

## Verify Fix

After installing Anchor 0.31.1:

```bash
anchor --version
# Should show: 0.31.1

anchor build
# Should compile successfully

anchor test
# Should run tests
```

---

**Next:** Once build succeeds, run the permission tests!
