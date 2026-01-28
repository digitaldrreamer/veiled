# Ed25519 Security Integration Tests

This directory contains integration tests for Ed25519 signature verification security checks.

## Test Files

- `ed25519_security.test.ts` - TypeScript integration tests for all 6 security test cases
- `ed25519_security.rs` - Rust unit tests for instruction structure validation

## Running Tests

### Prerequisites

1. **Install Dependencies**:
   ```bash
   cd packages/anchor
   bun install
   ```

2. **Build Program**:
   ```bash
   bun run build
   ```

3. **Start Local Validator** (for local testing):
   ```bash
   solana-test-validator
   ```

### Run Tests

**Local Testing** (requires local validator):
```bash
cd packages/anchor
bun test tests/ed25519_security.test.ts
```

**Devnet Testing** (requires ANCHOR_PROVIDER_URL):
```bash
cd packages/anchor
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com bun test tests/ed25519_security.test.ts
```

## Test Cases

### 1. Valid Signature (Success Path)
- Creates valid Ed25519 instruction with correct message
- Verifies `verify_auth` succeeds
- **Expected**: Transaction succeeds

### 2. Wrong Instruction Order
- Places program instruction BEFORE Ed25519 instruction
- **Expected**: Transaction fails (Ed25519 instruction not found)

### 3. Message Content Mismatch
- Signs one message but puts different message in verification result
- **Expected**: Transaction fails with `ProofHashMismatch` error

### 4. Authority Mismatch
- Signs with different keypair than expected authority
- **Expected**: Transaction fails with `AuthorityMismatch` error

### 5. Invalid Signature
- Uses random bytes as signature (doesn't verify)
- **Expected**: Transaction fails (Ed25519Program rejects invalid signature)

### 6. Expired Timestamp
- Uses timestamp from 10 minutes ago (>5 minute limit)
- **Expected**: Transaction fails with `ProofExpired` error

### 7. Duplicate Nullifier
- Attempts to use same nullifier twice
- **Expected**: First succeeds, second fails with `DuplicateNullifier` error

## Security Checks Validated

These tests verify all 8 security checks are working:

1. ✅ Program ID validation
2. ✅ No accounts check
3. ✅ Header length validation
4. ✅ Signature count validation
5. ✅ **CRITICAL**: Offset index validation (u16::MAX only)
6. ✅ Bounds checking
7. ✅ Message content validation
8. ✅ Authority validation

## Notes

- Tests require SOL for transaction fees (automatically airdropped on localnet/devnet)
- Each test uses unique nullifiers to avoid conflicts
- Tests are designed to be run in sequence (some depend on previous state)
- For production testing, use a dedicated test wallet
