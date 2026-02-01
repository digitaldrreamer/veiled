# Deployment & Utility Scripts

## Overview

Scripts for deploying the Veiled program, validating configuration, and testing functionality.

## Scripts

### `deploy-program.sh`

Safe deployment script that enforces correct deployment order:
1. Validates Program ID consistency
2. Builds the program
3. Verifies IDL matches declare_id!
4. Checks wallet balance
5. Deploys the program

**Usage:**
```bash
# Deploy to devnet
bun run deploy:devnet

# Deploy to localnet
bun run deploy:localnet

# Or directly:
./scripts/deploy-program.sh devnet
./scripts/deploy-program.sh localnet
```

**What it prevents:**
- ❌ Deploying with mismatched Program IDs
- ❌ Deploying before rebuilding
- ❌ Deploying old binary with new Program ID
- ❌ Manual deployment mistakes

### `validate-program-id.ts`

Validates that the Program ID is consistent across:
- `packages/anchor/programs/veiled/src/lib.rs` (declare_id!)
- `packages/anchor/Anchor.toml` (programs.devnet/localnet)
- `packages/anchor/target/idl/veiled.json` (IDL address)
- `apps/demo/static/idl/veiled.json` (demo app IDL)
- `packages/core/src/solana/program.ts` (VEILED_PROGRAM_ID constant)

**Usage:**
```bash
bun run validate-program-id
```

**When to run:**
- Before every deployment
- After changing Program ID
- In CI/CD pipeline
- Before committing Program ID changes

### `mint-devnet-nft.ts`

Mints a test NFT collection and NFT on Solana devnet for testing the `nft_ownership` circuit.

**Usage:**
```bash
bun run mint-devnet-nft
```

**Requirements:**
- Wallet keypair (default: `~/.config/solana/id.json` or set `SOLANA_KEYPAIR` env var)
- Devnet SOL (ensure your wallet has devnet SOL - use Solana CLI or web faucet)

**What it does:**
1. Creates a collection NFT
2. Mints an NFT into that collection
3. Verifies the collection
4. Outputs the collection address for use in the demo app

**Output:**
- Collection Address (copy this to your demo app)
- NFT Mint Address
- Verification status

**Example:**
```bash
# Set custom keypair (optional)
export SOLANA_KEYPAIR=/path/to/your/keypair.json

# Run the script
bun run mint-devnet-nft
```

### `verify-nft-collection.ts`

Verifies a collection on an existing NFT. This is needed for the NFT to appear in DAS API grouping array.

**Usage:**
```bash
bun run verify-nft-collection <NFT_MINT_ADDRESS> <COLLECTION_MINT_ADDRESS>
```

**Example:**
```bash
bun run verify-nft-collection Bxp1KQ1yBD7KaZw9AAxENdXWAziduZxBPb6PzZkBoSU9 3PcvomKABrxWJdJzajKEP4hQXxfqWVtKVXWc6aLSMsdE
```

**Requirements:**
- Wallet keypair (must be collection authority)
- NFT and collection mint addresses

## Program ID

**Current Program ID:** `H6apEGZAw23AKUeqCX41wkDv2LVwX3Ec8oYPip7k3xzA`

**To change Program ID:**
1. Update `packages/anchor/programs/veiled/src/lib.rs` (declare_id!)
2. Run `anchor build` (regenerates IDL)
3. Update `packages/anchor/Anchor.toml` (programs.devnet/localnet)
4. Update `packages/core/src/solana/program.ts` (VEILED_PROGRAM_ID)
5. Copy new IDL to `apps/demo/static/idl/veiled.json`
6. Run `bun run validate-program-id` to verify
7. Deploy using `bun run deploy:devnet`

## Troubleshooting

**Error: "Program ID validation failed"**
- Check all files listed above have the same Program ID
- Run `bun run validate-program-id` to see which file has the mismatch

**Error: "IDL address does not match declare_id!"**
- Run `anchor build` to regenerate the IDL
- The IDL is auto-generated from lib.rs, so they should always match after a build

**Error: "Insufficient balance"**
- Send SOL to deployer wallet
- Required: ~1.73 SOL for deployment

## Verification Key Generation

For generating verification keys, see [packages/core/scripts/README.md](../packages/core/scripts/README.md).
