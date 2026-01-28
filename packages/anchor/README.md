# Veiled Anchor Program

Solana on-chain program for verifying zero-knowledge proofs and managing nullifier registry.

## Structure

```
packages/anchor/
├── programs/veiled/          # Anchor program source
│   ├── src/
│   │   ├── lib.rs           # Main program entry
│   │   └── errors.rs        # Custom error codes
│   └── Cargo.toml
├── tests/                    # TypeScript integration tests
├── Anchor.toml              # Anchor configuration
└── Cargo.toml               # Workspace Cargo.toml
```

## Development

### Build

**Note:** Due to cargo proxy issues with cursor.appimage, use the direct cargo path:

```bash
# Using npm script (uses direct cargo path)
bun run check

# Or manually:
cd programs/veiled && ~/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin/cargo check

# For production build (build-sbf):
cd programs/veiled && ~/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin/cargo build-sbf
```

**Alternative:** Source the cargo environment script:
```bash
source .cargo-env.sh
cd programs/veiled && cargo check
```

### Test

```bash
bun test
```

## Current Status

- ✅ Basic program structure
- ✅ `verify_auth` instruction scaffold
- ✅ Nullifier account structure
- ⏳ Groth16 proof verification (TODO)
- ⏳ PDA-based nullifier registry (TODO)
