# Veiled Circuits

Zero-knowledge circuits for privacy-preserving authentication on Solana.

## Overview

This package contains Noir circuits that generate ZK proofs for:
- **Wallet Ownership**: Prove you control a Solana wallet without revealing the address
- **Balance Range**: Prove you have sufficient balance without revealing exact amount
- **NFT Ownership**: Prove you own an NFT from a collection without revealing which one

## Structure

```
packages/circuit/
├── src/
│   ├── main.nr              # Wallet ownership circuit
│   ├── balance_range.nr     # Balance proof circuit (Week 3)
│   ├── nft_ownership.nr     # NFT proof circuit (Week 3)
│   └── lib.nr               # Shared utilities
├── tests/                   # Circuit tests
├── Nargo.toml               # Noir configuration
├── Prover.toml              # Prover inputs template
└── README.md                # This file
```

## Prerequisites

Install Noir CLI:
```bash
curl -L https://install.aztec.network | bash
noir --version
```

## Development

### Compile Circuit
```bash
nargo compile
```

### Generate Proof
```bash
# Update Prover.toml with test inputs
nargo prove
```

### Verify Proof
```bash
nargo verify
```

## Circuit Design

See `docs/CIRCUIT_DESIGN.md` for detailed specifications.

## Status

- [x] Project structure
- [ ] Wallet ownership circuit (in progress)
- [ ] Balance range circuit
- [ ] NFT ownership circuit
- [ ] Tests
- [ ] Verification key export
