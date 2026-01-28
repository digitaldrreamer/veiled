# 🔧 SYSTEM ISSUES RESOLUTION GUIDE
## Fix Permissions & GLIBC for Anchor Testing | January 26, 2026

---

## Executive Summary

You have two system-level issues blocking testing:

1. **Permission errors** on `target/` directory
2. **GLIBC 2.39 requirement** (system has older version)

Both are fixable. Here are all solutions, ranked by ease and safety.

---

## Issue 1: Permission Errors (Easy Fix) ✅

### Symptoms

```
Error: Operation not permitted
Cannot modify target/ directory
```

### Quick Fix

```bash
# Navigate to program directory
cd packages/anchor/programs/veiled

# Fix permissions for current user
chmod -R u+w target/

# OR: Make user the owner
sudo chown -R $USER:$USER target/

# Verify fix
ls -ld target/
# Should show: drwxr-xr-x (or drwxrwxr-x if group writable)
```

### Why This Happens

- Build artifacts created with different permissions
- Solana-test-validator or previous build left read-only files
- Simple file permission issue

### Solution Duration: 2 minutes ⏱️

---

## Issue 2: GLIBC 2.39 (Multiple Solutions)

### Current Situation

```
GLIBC 2.39 is required
Your system has: GLIBC 2.35 (Ubuntu 22.04) or similar
```

### Solution A: Use Docker (RECOMMENDED) ✅✅

**Why this is best:**
- ✅ No system modifications needed
- ✅ Consistent environment
- ✅ Used by Solana foundation for builds
- ✅ Can't break your system
- ✅ Works on any Linux distribution
- ✅ Official Anchor approach for verifiable builds

**Step 1: Install Docker**

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Start docker service
sudo systemctl start docker
sudo usermod -aG docker $USER

# Log out and back in for group to take effect
# OR: Use sudo docker commands
```

**Step 2: Use Anchor with Docker**

```bash
# Option A: Verifiable build (uses official Solana container)
cd packages/anchor
anchor build --verifiable

# This automatically:
# - Pulls solanafoundation/anchor:latest (has GLIBC 2.39)
# - Builds your program in clean container
# - Outputs to target/verifiable/
```

**Step 3: Run Tests in Docker**

```bash
# Build and test in Docker
cd packages/anchor
anchor test --docker
```

**Duration: 10-15 minutes (includes Docker download)** ⏱️

### Solution B: Downgrade Anchor Version (Easy) ✅

If you want to use the Anchor version compatible with your GLIBC:

**Find Compatible Version:**

```bash
# Check your GLIBC version
ldd --version | head -n1
# Output: ldd (GNU libc) 2.35

# Anchor versions by GLIBC requirement:
# 0.32.0+  : GLIBC 2.39
# 0.31.x   : GLIBC 2.35-2.38
# 0.30.x   : GLIBC 2.34-2.37
```

**Downgrade to Compatible Version:**

```bash
cd packages/anchor

# Update Anchor to 0.31.1 (compatible with GLIBC 2.35)
npm install @coral-xyz/anchor@0.31.1

# Update Anchor CLI
npm install -g @coral-xyz/anchor-cli@0.31.1

# Verify version
anchor --version
# Should show: 0.31.1
```

**Duration: 5 minutes** ⏱️

**Trade-offs:**
- ⚠️ Using older Anchor version
- ⚠️ May have bugs fixed in 0.32.1
- ✅ Simpler than Docker
- ✅ Works immediately

### Solution C: Update System GLIBC (Risky) ⚠️

**NOT RECOMMENDED** - can break your system

Only attempt if Docker doesn't work and Anchor downgrade isn't acceptable.

```bash
# Get newer GLIBC from Ubuntu 24.04
# This is complex and risky - skip if you can use Docker

# Risk: System instability, broken dependencies
# Benefit: Latest tools
# Success rate: 60-70% depending on system
```

**Skip this unless absolutely necessary.**

### Solution D: Use Alternative Test Method (Workaround)

If Docker isn't available and you don't want to downgrade:

```bash
# Manual testing via demo app instead of anchor test
cd apps/demo
bun run dev

# Then manually test through UI:
# 1. Connect wallet
# 2. Generate proof
# 3. Submit to program
# 4. Verify nullifier account created
# 5. Try duplicate (should fail)
```

**Duration: 20-30 minutes** ⏱️

**Trade-offs:**
- ✅ No system changes
- ✅ Tests functionality manually
- ❌ Not automated
- ❌ No test framework

---

## Recommended Path Forward

### Step 1: Fix Permissions (2 minutes)

```bash
cd packages/anchor/programs/veiled
chmod -R u+w target/
```

### Step 2: Choose One Solution for GLIBC

**BEST OPTION: Docker**
```bash
# Install Docker
sudo apt-get install docker.io
sudo usermod -aG docker $USER

# Use Docker for build/test
cd packages/anchor
anchor build --verifiable
anchor test --docker
```

**QUICK OPTION: Downgrade Anchor**
```bash
# Downgrade to version compatible with your GLIBC
npm install @coral-xyz/anchor@0.31.1
npm install -g @coral-xyz/anchor-cli@0.31.1

# Then run normally
anchor test
```

**FALLBACK OPTION: Manual Testing**
```bash
# If other options fail, test manually
cd apps/demo
bun run dev

# Test through UI manually
```

---

## Complete Testing Checklist

### Pre-Testing Setup

- [ ] Fix permissions: `chmod -R u+w target/`
- [ ] Choose GLIBC solution (Docker OR downgrade)
- [ ] Verify installation worked

### Build & Deploy

```bash
cd packages/anchor

# Option A: With Docker (Recommended)
anchor build --verifiable
anchor deploy  # Requires ledger or keypair

# Option B: Without Docker (if downgraded Anchor)
anchor build
anchor deploy
```

### Run Tests

```bash
# Start local validator (Terminal 1)
solana-test-validator

# Run tests (Terminal 2)
cd packages/anchor
anchor test --skip-local-validator
```

### Expected Test Results

All 7 tests should pass:
- ✅ Valid signature succeeds
- ✅ Invalid signature fails
- ✅ Nullifier reuse fails
- ✅ Wrong instruction order fails
- ✅ Message mismatch fails
- ✅ Authority mismatch fails
- ✅ Expired timestamp fails

### If Tests Pass

✅ Critical path complete  
✅ Ready for week 4 polish  
✅ All security checks verified

---

## Troubleshooting

### Docker Issues

**Problem: Docker command not found**
```bash
# Solution: Add to PATH or use full path
/usr/bin/docker --version

# Or reinstall Docker
sudo apt-get install --reinstall docker.io
```

**Problem: Permission denied while using docker**
```bash
# Solution: Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in
```

**Problem: Docker image download fails**
```bash
# Solution: Check internet, try again
docker pull solanafoundation/anchor

# Or specify version
docker pull solanafoundation/anchor:v0.32.1
```

### Anchor Version Issues

**Problem: anchor command not found**
```bash
# Solution: Install via npm
npm install -g @coral-xyz/anchor-cli@0.31.1

# Or use local npm version
npx @coral-xyz/anchor-cli@0.31.1 build
```

**Problem: Version mismatch between CLI and library**
```bash
# Solution: Ensure matching versions
npm ls @coral-xyz/anchor
npm ls -g @coral-xyz/anchor-cli

# Update both to same version
npm install @coral-xyz/anchor@0.31.1
npm install -g @coral-xyz/anchor-cli@0.31.1
```

### Permission Issues After Fix

**Problem: Still getting permission errors**
```bash
# Solution: More aggressive permission reset
cd packages/anchor

# Reset all permissions
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
find . -name "*.so" -exec chmod 755 {} \;

# Or: Remove and rebuild
rm -rf target/
anchor build
```

---

## System Check Commands

### Check Current State

```bash
# Check GLIBC version
ldd --version | head -n1

# Check Anchor version
anchor --version

# Check Node version
node --version

# Check npm version
npm --version

# Check Solana CLI version
solana --version

# Check Rust version
rustc --version

# Check Solana toolchain
rustup show
```

### Expected Output for Anchor 0.31.1

```
GLIBC: 2.35 or newer (recommended: 2.35+)
Anchor: 0.31.1
Node: 20.x or newer
npm: 10.x or newer
Solana CLI: 1.18.x
Rust: 1.75+
```

---

## Summary Table

| Solution | Duration | Difficulty | Safety | Recommendation |
|----------|----------|-----------|--------|----------------|
| Fix Permissions | 2 min | Easy | Safe | DO FIRST ✅ |
| Docker | 15 min | Medium | Safe | BEST ✅✅ |
| Downgrade Anchor | 5 min | Easy | Safe | QUICK ✅ |
| Manual Testing | 30 min | Medium | Safe | FALLBACK |
| Update GLIBC | Varies | Hard | Risky | AVOID ❌ |

---

## Next Steps After Fixing

1. ✅ Fix permissions (2 min)
2. ✅ Choose GLIBC solution (Docker or downgrade)
3. ✅ Run `anchor build`
4. ✅ Run `anchor test`
5. ✅ Verify all 7 tests pass
6. ✅ Mark critical path complete

**Total time: 30-45 minutes maximum**

---

## References

- **Docker Installation**: https://docs.docker.com/install/
- **Anchor Documentation**: https://www.anchor-lang.com/docs
- **Solana CLI**: https://docs.solana.com/cli
- **GLIBC Compatibility**: Binaries are backward-compatible only (newer GLIBC runs older binaries, not vice versa)

---

**You're just one command away from having tests running. Start with fixing permissions, then pick Docker or downgrade Anchor. Done in 30 minutes.** 🚀
