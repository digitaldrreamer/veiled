# Bounty Requirements Checklist

**Maximizing prize potential across all bounties**

Total Potential: **$36k** across 5 bounties

---

## Track 02: Privacy Tooling ($15,000)

**Primary Track - Highest Priority**

### Requirements

✅ **Infrastructure, Libraries, OR Frameworks** (need at least one)
- [ ] Infrastructure: Anchor program for proof verification
- [ ] Libraries: @veiled/core (framework-agnostic JS/TS SDK)
- [ ] Framework: OAuth-like authentication system

✅ **Makes Privacy Easier for Developers**
- [ ] Simple API (3-line integration)
- [ ] Clear documentation
- [ ] Working examples
- [ ] Reduces complexity (no manual ZK implementation needed)

✅ **Privacy-Focused**
- [ ] Protects user wallet addresses
- [ ] Selective disclosure support
- [ ] Unlinkable across sites

✅ **Production-Ready (or close)**
- [ ] Working demo
- [ ] Tests passing
- [ ] Deployed to devnet
- [ ] Documentation complete

### Submission Checklist

**Code:**
- [ ] GitHub repo public
- [ ] MIT license (open source)
- [ ] README explains developer benefits
- [ ] Multiple working examples
- [ ] Test suite with >70% coverage

**Documentation:**
- [ ] Quickstart guide (<5 min to integrate)
- [ ] API reference
- [ ] Architecture overview
- [ ] Integration guide
- [ ] FAQ section

**Demo:**
- [ ] Live demo deployed
- [ ] Works reliably
- [ ] Shows privacy benefits clearly
- [ ] Includes before/after comparison

**Submission Description:**
```markdown
# Veiled: Privacy Infrastructure for Solana Developers

## What is it?
An OAuth-like authentication system for Solana that uses zero-knowledge proofs to enable wallet authentication without exposing wallet addresses.

## Why Privacy Tooling?
- **Infrastructure**: Anchor program verifies proofs on-chain
- **Libraries**: @veiled/core (framework-agnostic JS/TS SDK)
- **Framework**: Complete authentication system with familiar API

## Developer Benefits:
- 3-line integration (vs. weeks of ZK circuit work)
- OAuth-like API (familiar patterns)
- Works with existing wallets (Phantom, Backpack)
- Production-ready (tests, docs, examples)

## Impact:
Every Solana dApp needs authentication. Veiled makes it private by default.

[Demo] [Docs] [GitHub]
```

**Judging Criteria Focus:**
- Innovation: ZK-based auth for Solana (novel)
- Utility: Every dApp needs auth
- Execution: Working, documented, tested
- Impact: Enables ecosystem-wide privacy

---

## Helius Bounty ($5,000)

**"Best Privacy Project Using Helius"**

### Requirements

✅ **Use Helius RPC/APIs**
- [ ] Helius SDK installed and used
- [ ] Use enhanced APIs (not just standard RPC)
- [ ] Preferably multiple API endpoints

✅ **Privacy-Related Project**
- [ ] Veiled is privacy-focused ✓

✅ **Showcase Integration**
- [ ] README mentions Helius prominently
- [ ] Code examples using Helius
- [ ] Demo shows Helius features

### Implementation Checklist

**Code Integration:**
```typescript
// MUST HAVE: Import and use Helius SDK
import { Helius } from '@helius-labs/sdk';

const helius = new Helius(process.env.HELIUS_API_KEY);

// SHOWCASE: Enhanced APIs (not standard RPC)
const nfts = await helius.rpc.getAssetsByOwner({
  ownerAddress: wallet.publicKey.toBase58(),
  page: 1,
  limit: 1000,
});

// BONUS: WebSocket for real-time updates
helius.connection.onProgramAccountChange(
  VEILED_PROGRAM_ID,
  (accountInfo) => {
    console.log('New auth event:', accountInfo);
  }
);
```

**Documentation Requirements:**
- [ ] "Powered by Helius" badge in README
- [ ] Section explaining Helius integration
- [ ] Environment variable setup for Helius
- [ ] Code examples using Helius APIs

**Demo Requirements:**
- [ ] Use Helius RPC in live demo
- [ ] Show NFT fetching with Helius (if applicable)
- [ ] Mention Helius in demo video

### README Section Template

```markdown
## Powered by Helius

Veiled uses [Helius](https://helius.dev) for enhanced Solana data:

- **Enhanced NFT APIs**: Fetch NFT metadata with `getAssetsByOwner`
- **WebSocket Support**: Real-time auth event notifications
- **Reliable RPC**: High-performance devnet/mainnet access

### Setup

```bash
export HELIUS_API_KEY=your_key_here
export NEXT_PUBLIC_HELIUS_RPC=https://devnet.helius-rpc.com/?api-key=your_key
```

Get your API key at [helius.dev](https://helius.dev)
```

### Submission Notes
- [ ] Tag: #helius in submission
- [ ] Title includes "using Helius"
- [ ] First paragraph mentions Helius
- [ ] Screenshot shows Helius API usage

**Expected: 60% win probability**

---

## Quicknode Bounty ($3,000)

**"Most Impactful Open-Source Privacy Tooling"**

### Requirements

✅ **Open Source**
- [ ] MIT license
- [ ] Public GitHub repo
- [ ] Contributing guidelines
- [ ] Code of conduct

✅ **Privacy Tooling**
- [ ] Infrastructure OR libraries OR frameworks
- [ ] Makes privacy easier

✅ **Impactful**
- [ ] Solves real problem
- [ ] Benefits ecosystem
- [ ] Usable by others

✅ **Uses Quicknode (Bonus)**
- [ ] Support Quicknode RPC
- [ ] Document how to use Quicknode

### Open Source Checklist

**License:**
```
MIT License

Copyright (c) 2026 Veiled

Permission is hereby granted, free of charge, to any person obtaining a copy...
```

**README Quality:**
- [ ] Clear project description
- [ ] Installation instructions
- [ ] Usage examples
- [ ] Contribution guidelines
- [ ] License badge

**Contributing.md:**
```markdown
# Contributing to Veiled

## Getting Started
1. Fork the repository
2. Clone your fork
3. Install dependencies: `bun install`
4. Run tests: `bun test`

## Making Changes
1. Create a feature branch
2. Make your changes
3. Add tests
4. Submit pull request

## Code Style
- Use Prettier for formatting
- Follow TypeScript best practices
- Add JSDoc comments
```

**Quicknode Integration:**
```typescript
// Support multiple RPC providers
const connection = new Connection(
  process.env.RPC_PROVIDER === 'helius'
    ? process.env.HELIUS_RPC_URL
    : process.env.QUICKNODE_RPC_URL
);

// Document in README:
// ## RPC Providers
// Veiled supports:
// - Helius (recommended for enhanced APIs)
// - Quicknode (reliable alternative)
//
// Setup:
// export QUICKNODE_RPC_URL=https://your-endpoint.quiknode.pro/YOUR_KEY/
// export RPC_PROVIDER=quicknode
```

### Impact Statement Template

```markdown
## Impact

Veiled enables privacy-preserving authentication for the entire Solana ecosystem:

- **1000+ dApps** need authentication
- **Zero competitors** with ZK-based auth on Solana
- **Drop-in replacement** for "Sign in with Solana"
- **Open source** so anyone can use/modify/improve

### Use Cases Enabled:
- NFT-gated access without wallet exposure
- DeFi without revealing net worth
- Anonymous DAO participation
- Private community forums
```

### Submission Notes
- [ ] Emphasize "open source" and "public benefit"
- [ ] Include GitHub stars/forks count
- [ ] Show community interest (issues, PRs)
- [ ] Demonstrate usability (examples, docs)

**Expected: 50% win probability**

---

## Aztec/Noir Bounty ($10,000 Pool)

**Multiple Prize Categories:**
- Best Overall: $5,000
- Best Non-Financial: $2,500
- Best DeFi: $2,500

**Target: Best Non-Financial ($2,500)**

### Requirements

✅ **Uses Noir for ZK Circuits**
- [ ] Circuits written in Noir (not circom)
- [ ] Uses Noir stdlib functions
- [ ] Compiles with nargo

✅ **Creative Application**
- [ ] Novel use of ZK proofs
- [ ] Not just copy-paste example
- [ ] Thoughtful circuit design

✅ **Non-Financial Use Case**
- [ ] Authentication (not payments) ✓
- [ ] Not DeFi-related ✓

### Why Veiled Qualifies for "Best Non-Financial"

**Authentication is explicitly non-financial:**
- No tokens transferred
- No value exchanged
- No financial transactions
- Pure identity/access control

**Creative Application:**
- First ZK auth for Solana
- OAuth model in Web3
- Selective disclosure patterns

### Circuit Documentation Checklist

**In-Circuit Comments:**
```noir
// Circuit: Wallet Ownership Proof
// Purpose: Prove wallet ownership without revealing address
// Author: Veiled Team
// License: MIT

fn main(
    // PRIVATE: User's secret key (never revealed)
    wallet_secret_key: [u8; 32],
    
    // PUBLIC: Hash of public key (commitment)
    wallet_pubkey_hash: pub Field,
    
    // ... more parameters
) {
    // STEP 1: Derive public key from secret
    // This proves we know the secret key
    let pubkey = std::ec::derive_public_key(wallet_secret_key);
    
    // STEP 2: Verify commitment
    // Hash(pubkey) must match the public commitment
    let hash = std::hash::poseidon::bn254::hash_1([pubkey]);
    assert(hash == wallet_pubkey_hash);
    
    // ... rest of circuit
}
```

**README Section:**
```markdown
## Why Noir?

We chose Noir over circom for several reasons:

1. **Better Solana Integration**: Rust-like syntax, easier Anchor interop
2. **Simpler Syntax**: More readable circuits, easier to audit
3. **Active Development**: Aztec team rapidly improving
4. **Smaller Proofs**: Groth16 proofs <1KB
5. **Better DX**: Helpful error messages, good documentation

## Circuit Design

Our circuits prioritize:
- **Simplicity**: <15,000 constraints per circuit
- **Security**: Auditable logic, no custom crypto
- **Performance**: <5s proof generation in browser

[Detailed circuit documentation →](./docs/CIRCUIT_DESIGN.md)
```

### Submission Notes
- [ ] Tag: #noir #aztec
- [ ] Title: "Veiled: ZK Authentication using Noir"
- [ ] Emphasize: "non-financial use case"
- [ ] Link to circuit documentation
- [ ] Explain design decisions

**Expected: 40% win probability**

---

## Range Compliance Bounty ($1,500 + API Credits)

**"Best Privacy App with Selective Disclosure"**

### Requirements

✅ **Use Selective Disclosure**
- [ ] Prove claims without full revelation
- [ ] Range proofs (balance ranges)
- [ ] Attribute proofs (age > 18, etc.)

✅ **Compliance-Aware**
- [ ] Consider regulatory requirements
- [ ] Optional audit trails
- [ ] KYC integration possible

✅ **Integrate Range SDK**
- [ ] Use Range's pre-screening tools
- [ ] Document integration

### Selective Disclosure Implementation

**Balance Range Example:**
```typescript
// User has 573 SOL
// Proves: balance > 100 SOL
// Reveals: "100-1000 SOL" range
// Hides: exact amount (573)

const result = await veiled.signIn({
  requirements: {
    wallet: true,
    balance: { minimum: 100_000_000_000 } // 100 SOL in lamports
  },
  domain: window.location.hostname
});

// Proof verifies minimum balance without revealing exact amount
// Note: Balance range disclosure is post-MVP feature
```

**Age Verification Example:**
```typescript
// User is 25 years old
// Proves: age > 18
// Reveals: "adult" status
// Hides: exact age (25)

// Note: Age verification requires off-chain credentials (post-MVP)
// Range SDK integration is post-MVP feature
// For MVP, focus on on-chain proofs: wallet ownership, balance, NFT ownership
const result = await veiled.signIn({
  requirements: {
    wallet: true
  },
  domain: window.location.hostname
});
```

### Range SDK Integration

```typescript
import { Range } from '@range-sdk/core';

// Initialize Range
const range = new Range({
  apiKey: process.env.RANGE_API_KEY
});

// Pre-screen user
const compliance = await range.preScreen({
  wallet: wallet.publicKey,
  checks: ['sanctions', 'pep']
});

// Integrate with Veiled
// Note: Range SDK compliance integration is post-MVP
const result = await veiled.signIn({
  requirements: {
    wallet: true
  },
  domain: window.location.hostname
});

// Proof + compliance data
console.log('Compliant:', result.compliance.passed);
```

### Documentation Checklist

**README Section:**
```markdown
## Compliance & Selective Disclosure

Veiled supports privacy-preserving compliance:

### Selective Disclosure
Prove eligibility without revealing sensitive data:
- Balance ranges (not exact amounts)
- Age verification (not exact birthdate)
- NFT ownership (not specific token ID)

### Compliance Features
- Range SDK integration for AML/sanctions screening
- Optional audit trails for regulated entities
- Selective disclosure maintains privacy while meeting requirements

### Example: DeFi Access

```typescript
// Prove: Balance > $10k, Not sanctioned
// Reveal: Range ("$10k-$100k"), Compliance status
// Hide: Exact balance, Other holdings

const result = await veiled.signIn({
  requirements: {
    wallet: true,
    balance: { minimum: 10_000, token: USDC_MINT }
  },
  domain: window.location.hostname
});
  reveal: 'balance_range',
  compliance: await Range.screen(wallet)
});
```
```

### Submission Notes
- [ ] Tag: #range #compliance
- [ ] Emphasize: "responsible privacy"
- [ ] Show: "Privacy + compliance are compatible"
- [ ] Include: Selective disclosure examples

**Expected: 70% win probability**

---

## Multi-Bounty Submission Strategy

### Primary Submission
**Submit to Track 02 as main entry**
- Most comprehensive submission
- Full documentation
- Complete feature set

### Sponsor Tags
**Tag ALL applicable bounties:**
```markdown
Tags: #privacy-tooling #helius #quicknode #noir #range

Bounty Categories:
- Track 02: Privacy Tooling (primary)
- Helius: Uses enhanced RPC APIs
- Quicknode: Open source privacy infrastructure
- Aztec/Noir: Non-financial ZK application
- Range: Selective disclosure + compliance
```

### Separate Demo Videos
**Create sponsor-specific demos (1-2 min each):**

1. **Helius Demo:**
   - Show NFT fetching with Helius API
   - Highlight WebSocket integration
   - Mention Helius by name

2. **Quicknode Demo:**
   - Show RPC configuration
   - Switch between providers
   - Emphasize open source

3. **Noir Demo:**
   - Show circuit code
   - Explain design decisions
   - Highlight non-financial use case

4. **Range Demo:**
   - Show selective disclosure
   - Demonstrate compliance screening
   - Balance privacy + regulation

### README Badges
```markdown
[![Privacy Tooling](https://img.shields.io/badge/Track-Privacy%20Tooling-purple)]()
[![Powered by Helius](https://img.shields.io/badge/Powered%20by-Helius-blue)]()
[![Built with Noir](https://img.shields.io/badge/Built%20with-Noir-black)]()
[![Quicknode Compatible](https://img.shields.io/badge/RPC-Quicknode-green)]()
[![Range Integrated](https://img.shields.io/badge/Compliance-Range-orange)]()
```

---

## Expected Value Calculation

### Conservative (30% main + 60% small)
- Track 02: $0 (not in top 3)
- Helius: $5,000 ✓
- Quicknode: $3,000 ✓
- Noir: $0
- Range: $1,500 ✓
**Total: $9,500**

### Moderate (30% main + 40% Noir + 60% small)
- Track 02: $15,000 ✓ (3rd place or win)
- Helius: $5,000 ✓
- Quicknode: $0
- Noir: $2,500 ✓ (best non-financial)
- Range: $1,500 ✓
**Total: $24,000**

### Best Case (sweep most)
- Track 02: $15,000 ✓
- Helius: $5,000 ✓
- Quicknode: $3,000 ✓
- Noir: $5,000 ✓ (best overall)
- Range: $1,500 ✓
**Total: $29,500+**

---

## Final Submission Checklist

**One Week Before Deadline:**
- [ ] All code complete and tested
- [ ] Main README perfect
- [ ] All bounty requirements met
- [ ] Demo deployed and stable
- [ ] Demo video recorded
- [ ] Sponsor demos recorded

**Three Days Before:**
- [ ] Test submission on fresh machine
- [ ] Proofread all documentation
- [ ] Verify all links work
- [ ] Check demo reliability
- [ ] Get feedback from 2-3 people

**Submission Day:**
- [ ] Submit to main track (Track 02)
- [ ] Tag ALL applicable bounties
- [ ] Share on Twitter
- [ ] Post in Solana Discord #ship
- [ ] Email sponsors (if allowed)
- [ ] Relax - you did great! 🎉

---

**Remember:** Quality over quantity. Better to nail 3 bounties than half-ass 5.

**Priority Order:**
1. Track 02 (biggest prize)
2. Helius (high probability)
3. Range (high probability)
4. Quicknode (moderate)
5. Noir (lower probability, but high value)

**Focus Time:**
- 60%: Track 02 (make it perfect)
- 20%: Helius + Range (easy wins)
- 15%: Quicknode (open source quality)
- 5%: Noir (document circuits well)
