# Quick Research Checklist

## 5-Minute Quick Checks

### 1. Check Anchor Version & Changelog
```bash
# Check current version
cd packages/anchor
grep "@coral-xyz/anchor" package.json

# Check latest version
npm view @coral-xyz/anchor version

# Check changelog for IDL/account fixes
# Look at: https://github.com/coral-xyz/anchor/releases
```

### 2. Search Anchor GitHub Issues
**Search Terms:**
- "BorshCoder accounts.size"
- "IDL accounts type"
- "account client undefined"
- "Program initialization error"

**URLs:**
- https://github.com/coral-xyz/anchor/issues?q=is%3Aissue+BorshCoder
- https://github.com/coral-xyz/anchor/issues?q=is%3Aissue+IDL+accounts

### 3. Check Anchor Examples
```bash
# Clone Anchor examples
git clone https://github.com/coral-xyz/anchor
cd anchor/tests
# Look for programs with account types
# Check their IDL structure
```

### 4. Test Workspace Pattern
```typescript
// Quick test in test file
try {
  const program = anchor.workspace.Veiled;
  console.log("Workspace works!");
} catch (e) {
  console.log("Workspace failed:", e);
}
```

### 5. Compare IDL Structure
```bash
# Find a working Anchor program's IDL
# Compare accounts array structure
# Check if they have type definitions in accounts array
```

## 15-Minute Deep Dive

### 1. Examine BorshCoder Source
```bash
cd packages/anchor
cat node_modules/@coral-xyz/anchor/dist/cjs/coder/borsh/index.js | grep -A 20 "accounts"
```

### 2. Check Anchor Build Process
```bash
# Check what anchor build generates
anchor build --help
# Look for IDL generation flags
```

### 3. Test Minimal IDL
Create a test file with minimal IDL to see what's required:
```typescript
const minimalIdl = {
  version: "0.1.0",
  name: "test",
  instructions: [...],
  // Try with/without accounts
  // Try with/without types
};
```

## 30-Minute Comprehensive Research

1. Read Anchor Book section on IDL
2. Check all Anchor GitHub issues related to IDL
3. Examine 3-5 example Anchor programs
4. Test different IDL structures
5. Check Solana Discord/forums for similar issues

## Key Questions to Answer

- [ ] Is this a known bug? (Check GitHub issues)
- [ ] What does a working IDL look like? (Check examples)
- [ ] Can we fix IDL generation? (Check Anchor docs)
- [ ] Is there a workaround? (Check community)
- [ ] Should we upgrade Anchor? (Check changelog)
