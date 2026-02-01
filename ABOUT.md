# About Veiled

## Mission

Veiled brings privacy-preserving authentication to Solana, enabling users to prove wallet ownership and eligibility without revealing their wallet address or financial history.

## The Problem We Solve

Current Solana authentication exposes users' entire financial history. Every "Sign in with Solana" integration leaks:
- Wallet addresses (permanent, trackable)
- Transaction history (all past activity)
- NFT collections (what you own)
- DeFi positions (your net worth)
- Cross-site tracking (same wallet everywhere)

**This is worse privacy than Web2 OAuth**, where at least your email isn't directly linked to your financial data.

## Our Solution

Veiled uses zero-knowledge proofs to enable:
- **Anonymous Authentication**: Prove wallet ownership without revealing the address
- **Selective Disclosure**: Share only what's needed (balance range, NFT ownership)
- **Cross-Site Unlinkability**: Different anonymous IDs per dApp (can't be tracked)
- **Developer-Friendly**: OAuth-like API, 3-line integration

## Technology

### Zero-Knowledge Circuits (Noir)

We use [Noir](https://noir-lang.org/) (Aztec's ZK language) to create circuits that prove:
- Wallet ownership (without revealing which wallet)
- Balance ranges (without revealing exact amount)
- NFT ownership (without revealing which NFT)

### On-Chain Verification (Anchor)

Our Solana program verifies ZK proofs on-chain using:
- Groth16 proof verification
- Nullifier registry (prevents replay attacks)
- Domain-scoped sessions (cross-site unlinkability)

### Developer SDK

TypeScript SDK that makes privacy-preserving auth as easy as:
```typescript
await veiled.signIn({ requirements: { wallet: true } });
```

## Use Cases

- **NFT-Gated Communities**: Prove NFT ownership without revealing which NFT
- **DeFi Access Control**: Gate access by balance without exposing net worth
- **Anonymous DAO Voting**: Vote verifiably without revealing identity
- **Gaming**: Cross-game identity without cross-site tracking
- **Enterprise**: Compliance-friendly selective disclosure

## Privacy Guarantees

### What We Prove
✅ You own a Solana wallet (without revealing which)
✅ Your balance meets requirements (without exact amount)
✅ You own specific NFTs (without revealing token ID)

### What We Hide
❌ Your wallet address
❌ Your transaction history
❌ Your net worth
❌ Your other holdings
❌ Your identity across different dApps

## Security

- **Cryptographically Sound**: Uses proven ZK proof systems (Groth16)
- **Non-Custodial**: Wallet keys never leave your device
- **Open Source**: All code is auditable
- **Pre-Audit**: Not yet audited - use at your own risk

## Built For

**Solana Privacy Hack 2026** - We're building this for the hackathon and the broader Solana privacy ecosystem.

## Open Source

Veiled is open source under the MIT License. We welcome contributions from the community.

## Roadmap

- **Phase 1 (MVP)**: Basic wallet ownership proof ✅
- **Phase 2**: NFT and balance proofs
- **Phase 3**: Production-ready with audits
- **Phase 4**: Mainnet deployment

## Team

Built by developers passionate about privacy in Web3.

## Contact

- **Email**: hello@veiled.sh
- **Twitter**: [@VeiledAuth](https://twitter.com/VeiledAuth) (coming soon)
- **Discord**: [Join our Discord](https://discord.gg/veiled) (coming soon)
- **Website**: [veiled.sh](https://veiled.sh)

---

**Built with ❤️ for a more private Web3**
