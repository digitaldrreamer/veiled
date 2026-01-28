# Running Ed25519 Security Tests

## Using Anchor Test (Recommended)

Anchor test automatically:
- Starts a local validator
- Deploys your program
- Runs tests
- Cleans up

### Run All Tests

```bash
cd packages/anchor

# Option 1: Let Anchor manage validator (recommended)
anchor test

# Option 2: Use existing validator
anchor test --skip-local-validator
```

### Prerequisites

1. **Build Program First**:
   ```bash
   anchor build
   ```

2. **Ensure Anchor.toml is configured**:
   - `[programs.localnet]` section exists
   - Program ID matches your `declare_id!()`

## Test File Structure

- **File**: `tests/ed25519_security.ts`
- **Framework**: Mocha + Chai (Anchor's default)
- **Pattern**: Uses `anchor.workspace.Veiled`

## What Anchor Test Does

1. ✅ Starts `solana-test-validator` (if not using `--skip-local-validator`)
2. ✅ Deploys program from `target/deploy/veiled.so`
3. ✅ Loads IDL from `target/idl/veiled.json`
4. ✅ Sets up `anchor.workspace` automatically
5. ✅ Runs all tests in `tests/` directory
6. ✅ Stops validator when done

## Manual Testing (Alternative)

If you prefer manual control:

```bash
# Terminal 1: Start validator
solana-test-validator

# Terminal 2: Run tests
cd packages/anchor
anchor test --skip-local-validator
```

## Troubleshooting

### Issue: "Workspace.Veiled is undefined"

**Fix**: Ensure Anchor.toml has:
```toml
[programs.localnet]
veiled = "YOUR_PROGRAM_ID"
```

Then rebuild:
```bash
anchor build
```

### Issue: "Program not deployed"

**Fix**: Build and deploy:
```bash
anchor build
anchor deploy --provider.cluster localnet
```

### Issue: "Cannot find module"

**Fix**: Install dependencies:
```bash
bun install
```

## Test Results

After running `anchor test`, you should see:

```
  Ed25519 Security Tests
    ✓ should accept valid Ed25519 signature
    ✓ should reject when program instruction comes before Ed25519 instruction
    ✓ should reject when message content doesn't match signature
    ✓ should reject when signature is from different authority
    ✓ should reject invalid Ed25519 signature
    ✓ should reject expired verification results
    ✓ should reject duplicate nullifier

  7 passing
```
