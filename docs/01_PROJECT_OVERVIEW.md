# Veiled - Privacy-Preserving OAuth for Solana

## Executive Summary

**WHAT:** A zero-knowledge proof authentication system that allows users to prove wallet ownership, NFT holdings, or balance requirements WITHOUT revealing their wallet address.

**WHY IT MATTERS:** Current Solana authentication exposes users' entire financial history. Every "Sign in with Solana" integration leaks wallet addresses, enabling tracking of net worth, NFTs, transaction history, and cross-site activity patterns.

**THE GAP:** Privacy solutions exist for payments, transfers, and DeFi. NOTHING exists for authentication privacy on Solana.

---

## The Problem

### Current State: Web3 Auth is Worse Than Web2

**Web2 OAuth (Google, Facebook):**
- ✅ Google tracks you
- ✅ But random website doesn't see your email
- ✅ Different identifier per site
- ✅ Can't correlate your activity across sites

**Web3 "Sign in with Solana":**
- ❌ No centralized tracker
- ❌ BUT every website sees your FULL wallet address
- ❌ Same identifier everywhere (your public key)
- ❌ Anyone can see: net worth, NFTs, all transactions, DeFi positions
- ❌ Sites can collude to track you across entire ecosystem

### Privacy Paradox

```
Web2: Centralized privacy violation (Google knows everything)
Web3: Distributed privacy violation (EVERYONE knows everything)

Which is worse? Debatable. But we can do better.
```

### Real-World Impact

**For Users:**
- NFT collector connects to chat → Everyone knows which apes they own
- DeFi user authenticates → Platform sees exact net worth
- Gamer logs in → Competitors can track their wallet activity
- DAO member votes → Voting history permanently public

**For dApps:**
- Can't offer private features (everyone watching on-chain)
- Can't do user segmentation without leaking data
- Can't A/B test (wallet history reveals cohort)
- Can't offer personalized experiences without privacy invasion

---

## The Solution: Veiled

### What to Build

A complete authentication infrastructure consisting of:

**1. Zero-Knowledge Circuits (Noir)**
- Prove wallet ownership without revealing address
- Prove NFT ownership without revealing which NFT
- Prove balance ranges without revealing exact amount
- Generate unique per-dApp nullifiers (prevents collusion)

**2. On-Chain Verification (Anchor Program)**
- Verify ZK proofs on Solana
- Store nullifiers (prevent replay attacks)
- Manage authentication sessions
- Emit authentication events

**3. Developer SDK (@veiled/core)**
- OAuth-like API for familiar developer experience
- Browser-based proof generation (<5s target)
- Multi-wallet support (Phantom, Backpack, Solflare)
- Multi-RPC support (Helius, Quicknode)

**4. Framework-Agnostic SDK**
- @veiled/core (TypeScript SDK usable from React/Svelte/vanilla)
- Examples for Next.js, SvelteKit, vanilla JS

---

## Why This Wins the Hackathon

### Track 02: Privacy Tooling - Perfect Fit

**What Track 02 Wants:**
"Tools and infrastructure that make it easier for developers to build with privacy"

**What Veiled Delivers:**
✅ Infrastructure: ZK circuits + Anchor program + SDK
✅ Tools: Developer libraries, documentation, examples
✅ Makes privacy easier: 3-line integration vs complex ZK implementation
✅ For developers: Not an app, but tooling for ecosystem

### Novel for Solana

**Existing on Solana:**
- Private payments ✓ (Privacy Cash, ShadowWire)
- Private transactions ✓ (Confidential Transfers)
- Private DeFi ✓ (Arcium, Elusiv legacy)
- Standard auth ✓ (Sign in with Solana, Web3Auth)

**Missing:**
- ❌ Privacy-preserving authentication
- ❌ ZK-proof based login
- ❌ Selective disclosure for auth
- ❌ Cross-site unlinkable identifiers

**Veiled fills this exact gap.**

### Responsible Privacy Design

Hackathon emphasizes "responsible privacy" not pure anonymity:

✅ **Selective Disclosure:** Prove necessary claims, hide everything else
✅ **Compliance-Friendly:** Can integrate with KYC (Range bounty)
✅ **Accountability:** Nullifiers enable rate limiting, abuse prevention
✅ **Not a Mixer:** No pooling funds, no helping bad actors
✅ **Audit Trails:** Optional logging for compliance

### Multi-Bounty Stacking Potential

| Bounty | Prize | Why Veiled Qualifies |
|--------|-------|---------------------|
| Track 02 | $15k | Core privacy tooling for developers |
| Helius | $5k | Uses Helius RPC for wallet data |
| Quicknode | $3k | Open-source privacy tooling |
| Aztec (Noir) | $2.5k-$5k | Uses Noir circuits (non-financial use) |
| Range | $1.5k | Selective disclosure + compliance |
| **Total** | **$27k-$29.5k** | **If executed well** |

---

## Why Solana Specifically

### Technical Advantages

**1. Fast Proof Verification**
- Solana: ~400ms block time → near-instant auth
- Ethereum: ~12s block time → slow UX
- **Why it matters:** Auth needs to feel instant, not waiting for blocks

**2. Cheap Storage**
- Nullifier storage on Solana: <$0.01 per user
- Nullifier storage on Ethereum: $5-$50 per user
- **Why it matters:** Economically viable at scale

**3. State Compression**
- Can store millions of nullifiers efficiently
- Merkle trees built into Solana primitives
- **Why it matters:** Scales to global adoption

**4. Wallet Ecosystem**
- Phantom (12M+ users), Backpack, Solflare all have Wallet Standard
- Easy integration via standard interface
- **Why it matters:** Immediate user base, no custom integrations

### Strategic Advantages

**1. Privacy is Solana's Next Frontier**
- Confidential Transfers launched April 2025
- Privacy Hack happening January 2026
- Foundation clearly prioritizing privacy infrastructure
- **Why it matters:** Aligned with ecosystem direction

**2. Every dApp Needs Auth**
- 1000+ Solana dApps exist today
- ALL need authentication
- Most use Sign in with Solana (not private)
- **Why it matters:** Built-in distribution channel

**3. Complementary to Existing Privacy Tools**
- Arcium: Private compute (not auth)
- Privacy Cash: Private payments (not auth)
- Confidential Transfers: Private transfers (not auth)
- **Why it matters:** No direct competition, fills gap

---

## Success Criteria

### Technical Success

**Minimum Viable Product:**
- ✅ Working ZK circuit for wallet ownership proof
- ✅ Deployed Anchor program on devnet
- ✅ SDK that generates proofs in <5 seconds
- ✅ One working demo (NFT-gated chat)

**Stretch Goals:**
- ✅ Multiple proof types (balance, NFT collection, time-based)
- ✅ Framework integrations (React, Svelte)
- ✅ Production deployment considerations

### Hackathon Success

**Conservative ($9.5k):**
- Win 3 small bounties (Helius, Quicknode, Range)
- Lose Track 02 to stronger projects

**Moderate ($22.5k):**
- Win Track 02 + 2 bounties
- Strong technical execution + good presentation

**Best Case ($32k):**
- Win Track 02 + all bounties
- Sweep by being both technically excellent AND well-presented

### Long-Term Success Indicators

- Other Solana projects adopt Veiled for auth
- Community contributions (issues, PRs)
- Featured in Solana documentation
- Security audit interest
- Mainnet deployment requests

---

## What This Document Enables

**For Solo Developer:**
- Clear scope: Know exactly what to build
- Prioritization: Focus on MVP, skip nice-to-haves
- Validation: Confirm alignment with hackathon requirements
- Motivation: Understand impact and potential

**For Development:**
- Architecture decisions justified (why Noir not circom)
- Feature requirements clear (wallet proof > everything else)
- Success metrics defined (what "done" looks like)
- Bounty requirements mapped (what to emphasize)

**For Presentation:**
- Problem statement ready (Web3 auth worse than Web2)
- Unique value clear (fills authentication gap)
- Solana-specific advantages documented
- Multiple audience angles (users, developers, judges)

---

## Next Steps

**Read in Order:**
1. `02_TECHNICAL_ARCHITECTURE.md` - System components and why each exists
2. `03_CORE_FEATURES.md` - Feature requirements with justifications
3. `04_BUILD_ROADMAP.md` - Week-by-week deliverables
4. `05_BOUNTY_REQUIREMENTS.md` - What to build for each bounty
5. `06_TECHNOLOGY_DECISIONS.md` - Tech stack choices explained

**Then Start Building:**
- Week 1: ZK circuits + Noir setup
- Week 2: Anchor program + on-chain verification
- Week 3: SDK + demo dApp
- Week 4: Polish + multi-bounty submission

---

## Document Metadata

**Version:** 1.0  
**Created:** January 2026  
**Purpose:** Project specification for Solana Privacy Hack  
**Audience:** Solo developer building Veiled  
**Status:** Specification complete, ready to build
