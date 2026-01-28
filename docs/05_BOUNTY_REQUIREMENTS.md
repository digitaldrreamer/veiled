# Bounty Requirements - What to Build for Each Prize

## Overview

Veiled can stack **5 bounties** by building the right features and emphasizing them in submissions.

```
Expected Value Calculation:
Conservative: $9.5k (3 small bounties)
Moderate: $22.5k (main track + 2 bounties)
Best Case: $32k (main track + all bounties)
```

---

## Primary Track: Track 02 - Privacy Tooling ($15,000)

### What Judges Want

**Official Description:**
> "Build innovative solutions for confidential or private transfers on Solana. Tools and infrastructure that make it easier for developers to build with privacy on Solana."

**Keywords to Target:**
- ✅ "Tools" = SDK, not just app
- ✅ "Infrastructure" = Anchor program, circuits
- ✅ "Make it easier" = Simple API, good DX
- ✅ "For developers" = B2D (business-to-developer) focus

### What to Build

**1. Complete Developer Stack:**
```
Infrastructure Layer:
├─ ZK Circuits (Noir)
├─ Anchor Program (verification)
└─ Nullifier Registry (storage)

Developer Tools:
└─ @veiled/core (framework-agnostic TypeScript SDK)

Documentation:
├─ Installation guide
├─ API reference
├─ Architecture diagrams
└─ Example code
```

**2. Developer Experience Features:**
```typescript
// MUST BE THIS SIMPLE
import { VeiledAuth } from '@veiled/core';

const veiled = new VeiledAuth({ rpcProvider: 'helius' });
const result = await veiled.signIn({ wallet: true });

// That's it. 3 lines. Like OAuth.
```

**3. Open Source Repository:**
```
GitHub repo must have:
✅ MIT License
✅ Clear README
✅ Installation instructions
✅ Code examples
✅ Architecture documentation
✅ Contributing guidelines
```

### What to Emphasize in Submission

**In README:**
```markdown
## For Developers

Veiled provides privacy-preserving authentication infrastructure for Solana developers.

### Quick Start
npm install @veiled/core

### Integration (3 lines)
[code example]

### Use Cases
- NFT-gated content without revealing holdings
- DeFi whitelisting without exposing net worth
- DAO voting without doxing identity
- Gaming without cross-game tracking
```

**In Pitch:**
- Lead with "developer tooling" (not "privacy app")
- Show code examples prominently
- Demonstrate "makes privacy easier"
- Compare complexity: Raw ZK (300 lines) vs Veiled (3 lines)

**In Video:**
- Screen time for code (30 seconds minimum)
- npm install sequence
- Side-by-side: Before (complex) vs After (simple)
- Developer testimonials (if have time to get them)

### Why Veiled Wins This Track

**Competitive Advantage:**
| Criteria | Veiled | Typical Privacy App |
|----------|--------|---------------------|
| Developer-focused | ✅ SDK-first | ❌ User-facing app |
| Easy integration | ✅ 3 lines | ❌ Complex setup |
| Infrastructure | ✅ Reusable | ❌ Single-purpose |
| Documentation | ✅ Complete | ❌ Minimal |

**Judge Questions (Prepare Answers):**
1. "How is this different from existing auth?"
   → Web3Auth exposes wallet address. Veiled hides it with ZK proofs.

2. "Why would developers use this?"
   → Users demand privacy. Current auth leaks everything. Veiled = OAuth-level privacy.

3. "Is this production-ready?"
   → MVP ready. Needs audit for mainnet. But API stable, DX proven.

### Submission Checklist

**Required:**
- [ ] GitHub repo public
- [ ] README with developer focus
- [ ] Working demo (proves it works)
- [ ] Video showing code
- [ ] Architecture documentation

**Bonus:**
- [ ] npm package published
- [ ] Example integrations (Next.js, SvelteKit)
- [ ] API reference docs
- [ ] Community traction (stars, forks)

---

## Bounty 1: Helius ($5,000)

### What They Want

**Official Prize:**
> "Best Privacy Project using Helius"

**Requirements:**
- Use Helius RPC
- Demonstrate enhanced API usage
- Show performance benefits

### What to Build

**1. Helius Integration (Core SDK):**
```typescript
// packages/core/src/providers/HeliusProvider.ts

export class HeliusProvider implements RPCProvider {
    private helius: Helius;
    
    constructor(apiKey: string) {
        this.helius = new Helius(apiKey);
    }
    
    // Use Helius Enhanced APIs
    async getNFTs(wallet: PublicKey): Promise<NFT[]> {
        const response = await this.helius.rpc.getAssetsByOwner({
            ownerAddress: wallet,
            sortBy: { sortBy: "recent_action", sortDirection: "desc" }
        });
        
        return response.items;
    }
    
    async getBalances(wallet: PublicKey): Promise<Balance[]> {
        const response = await this.helius.rpc.getParsedTokenAccountsByOwner({
            ownerAddress: wallet
        });
        
        return response.value.map(this.parseBalance);
    }
    
    // Use WebSocket for real-time updates
    async subscribeToAuth(nullifier: string, callback: Function) {
        this.helius.connection.onAccountChange(
            deriveNullifierPDA(nullifier),
            callback,
            "confirmed"
        );
    }
}
```

**2. Performance Benchmarks:**
```markdown
## Helius Performance Benefits

| Operation | Standard RPC | Helius Enhanced |
|-----------|--------------|-----------------|
| Fetch NFTs | 3-5 seconds | 500ms |
| Get balances | 2-3 seconds | 300ms |
| Proof generation | 5 seconds | 4.5 seconds (faster data) |

Veiled uses Helius for:
- NFT ownership verification (Enhanced API)
- Balance range proofs (Token API)
- Real-time session updates (WebSocket)
```

**3. README Section:**
```markdown
## Helius Integration

Veiled uses Helius RPC for enhanced performance:

\`\`\`typescript
const veiled = new VeiledAuth({
    rpcProvider: 'helius',
    rpcApiKey: process.env.HELIUS_API_KEY
});
\`\`\`

Get your Helius API key: https://helius.dev
```

### What to Emphasize in Submission

**In Submission Form:**
- "Veiled uses Helius Enhanced APIs for NFT verification"
- Link to HeliusProvider.ts code
- Link to performance benchmarks
- Screenshot of Helius dashboard showing API usage

**In Video:**
- Show Helius API key configuration
- Mention "powered by Helius" when fetching NFTs
- Display performance metrics

**In Repo:**
- Helius logo in README
- Dedicated section on Helius integration
- Example .env with HELIUS_API_KEY

### Why Helius Integration Matters

**For Bounty:**
- Clear API usage (code evidence)
- Enhanced API specifically (not just RPC)
- Privacy focus (NFT verification without exposure)

**For Project:**
- Helius is best Solana RPC (reliability)
- Enhanced APIs enable advanced features
- Free tier sufficient for development

### Submission Checklist

- [ ] HeliusProvider class implemented
- [ ] Helius mentioned in README
- [ ] Performance benchmarks documented
- [ ] .env.example with HELIUS_API_KEY
- [ ] Video shows Helius usage
- [ ] Bounty submission links to code

---

## Bounty 2: Quicknode ($3,000)

### What They Want

**Official Prize:**
> "Most Impactful Open-Source Privacy Tooling using Quicknode"

**Requirements:**
- Open source (MIT license)
- Privacy tooling (not app)
- Uses Quicknode RPC

### What to Build

**1. Quicknode Integration:**
```typescript
// packages/core/src/providers/QuicknodeProvider.ts

export class QuicknodeProvider implements RPCProvider {
    private connection: Connection;
    
    constructor(endpoint: string) {
        this.connection = new Connection(endpoint, {
            commitment: 'confirmed',
            httpHeaders: {
                'x-qn-api-version': '2023-01-01'
            }
        });
    }
    
    // Standard Solana RPC (Quicknode optimized)
    async getNFTs(wallet: PublicKey): Promise<NFT[]> {
        const response = await this.connection.getParsedTokenAccountsByOwner(
            wallet,
            { programId: TOKEN_PROGRAM_ID }
        );
        
        return this.parseNFTs(response.value);
    }
}
```

**2. Configuration Example:**
```typescript
// Support both Helius and Quicknode
const veiled = new VeiledAuth({
    rpcProvider: 'quicknode',  // or 'helius'
    rpcUrl: process.env.QUICKNODE_URL
});
```

**3. README Section:**
```markdown
## Quicknode Integration

Veiled supports Quicknode RPC for reliable Solana access:

\`\`\`typescript
const veiled = new VeiledAuth({
    rpcProvider: 'quicknode',
    rpcUrl: process.env.QUICKNODE_URL
});
\`\`\`

Get Quicknode endpoint: https://quicknode.com
```

### What to Emphasize in Submission

**In Submission Form:**
- "Open-source privacy tooling (MIT license)"
- "Enables developers to build private auth"
- Link to QuicknodeProvider.ts code
- Link to LICENSE file

**Key Points:**
1. **Open Source** - MIT license, public GitHub
2. **Privacy Tooling** - Not app, developer infrastructure
3. **Quicknode Support** - Works with their RPC

### Why Quicknode Qualification

**"Most Impactful":**
- Authentication needed by ALL dApps (high impact)
- Open source = anyone can use (broad impact)
- First privacy auth for Solana (novel impact)

**"Privacy Tooling":**
- Not privacy app (many exist)
- IS privacy tooling (SDK, infrastructure)
- Perfect match for bounty criteria

### Submission Checklist

- [ ] QuicknodeProvider implemented
- [ ] MIT License in repo
- [ ] Quicknode mentioned in README
- [ ] .env.example with QUICKNODE_URL
- [ ] Bounty submission emphasizes "tooling" not "app"

---

## Bounty 3: Aztec / Noir ($10,000 pool)

### What They Want

**Prize Tiers:**
- Best Overall Noir Project: $5,000
- Best Non-Financial Use Case: $2,500
- Best Design/Creative: $2,500

**Target:** Best Non-Financial Use Case ($2,500)
**Stretch:** Best Overall ($5,000)

### What to Build

**1. Noir Circuits (Not Circom):**
```noir
// circuits/wallet_ownership/src/main.nr
// MUST use Noir, not circom

use dep::std::hash::poseidon;
use dep::std::ec::tecurve::affine::Point;

fn main(
    secret_key: Field,
    domain: pub Field
) -> pub (Field, Field) {
    // Noir-specific syntax
    let nullifier = poseidon::bn254::hash_2([secret_key, domain]);
    let public_key = derive_pubkey(secret_key);
    let commitment = poseidon::bn254::hash_2([public_key.x, public_key.y]);
    
    (nullifier, commitment)
}
```

**2. Circuit Documentation:**
```markdown
# Noir Circuits for Veiled

## Why Noir?
- Rust-like syntax (safer, easier)
- Groth16 proofs (compact, fast)
- Better Solana integration
- Active Aztec development

## Circuits Implemented
1. wallet_ownership.nr - Basic authentication
2. nft_ownership.nr - Token gating
3. balance_range.nr - Financial requirements

## Performance
- Constraints: X per circuit
- Proving time: <5 seconds
- Verification: <200ms on Solana
```

**3. Creative Use Case Documentation:**
```markdown
## Authentication: A Non-Financial ZK Use Case

Most ZK applications focus on private payments or DeFi. Veiled explores a different space: authentication.

### Why Authentication is Interesting
- Every dApp needs it (universal)
- Not about money (non-financial)
- Proves identity without revealing identity (philosophical)
- Complements financial privacy (holistic)

### Technical Innovation
- Domain-scoped nullifiers (cross-site unlinkability)
- Selective disclosure (prove minimum, hide maximum)
- OAuth-like UX (familiar but private)
```

### What to Emphasize in Submission

**In Submission Form:**
- "Non-financial use case: Authentication"
- Link to Noir circuit code
- Link to architecture doc explaining ZK approach

**Why Non-Financial (Not Financial):**
```
Financial ZK:
- Private payments ❌
- Hidden balances ❌
- Secret transactions ❌

Veiled ZK:
- Prove wallet ownership ✅
- Prove NFT membership ✅
- Prove balance threshold ✅ (but not transacting)

Key difference: Proving vs Transacting
```

### Why Veiled is Creative

**Standard Noir Uses:**
- Private voting (done)
- Anonymous transfers (done)
- ZK rollups (done)

**Veiled's Novel Approach:**
- OAuth-like but ZK ✓
- Cross-site unlinkability ✓
- Selective disclosure for auth ✓
- **Nobody doing this on Solana** ✓

### Submission Checklist

- [ ] All circuits in Noir (not circom)
- [ ] Circuit documentation complete
- [ ] "Non-financial" emphasized
- [ ] Creative aspects highlighted
- [ ] Link to circuit code
- [ ] Performance metrics documented

---

## Bounty 4: Range ($1,500 + API Credits)

### What They Want

**Official Prize:**
> "Build private and confidential applications that are compliant and safe. Use Range's tools for pre-screening and selective disclosure."

**Keywords:**
- ✅ Selective disclosure
- ✅ Compliance
- ✅ Pre-screening

### What to Build

**1. Selective Disclosure (Core Feature):**
```typescript
// Already building this!
const result = await veiled.signIn({
    requirements: {
        balance: {
            minimum: 10_000,  // Prove >= 10k
            // Do NOT reveal actual amount
        },
        nft: {
            collection: COLLECTION_ID,  // Prove ownership
            // Do NOT reveal which NFT
        }
    }
});

// Result: Proofs only, no raw data
```

**2. Range SDK Integration (Optional):**
```typescript
// packages/core/src/compliance/RangeIntegration.ts

import { Range } from '@range/sdk';

export class RangeIntegration {
    async checkCompliance(
        nullifier: string,
        requirements: Requirements
    ): Promise<ComplianceResult> {
        const range = new Range(process.env.RANGE_API_KEY);
        
        // Pre-screen before generating proof
        const screening = await range.prescreen({
            requirements: this.mapToRangeFormat(requirements)
        });
        
        if (!screening.passed) {
            throw new Error('Compliance check failed');
        }
        
        return screening;
    }
}
```

**3. Documentation:**
```markdown
## Compliance & Selective Disclosure

Veiled implements responsible privacy through selective disclosure:

### What Gets Disclosed
- Proof of eligibility ✓
- Unique identifier (nullifier) ✓
- Timestamp ✓

### What Stays Private
- Wallet address ✗
- Exact balance ✗
- Specific NFTs owned ✗
- Transaction history ✗

### Range Integration (Optional)
Pre-screen users for compliance requirements:
[code example]
```

### What to Emphasize in Submission

**In Submission Form:**
- "Selective disclosure for authentication"
- "Compliance-friendly by design"
- Link to balance range circuit (proves threshold, not amount)
- Link to NFT circuit (proves membership, not specific NFT)

**Key Compliance Features:**
- Nullifiers enable rate limiting (prevent abuse)
- Expiry enables session management (not permanent)
- Optional audit trails (can log if needed)
- Works with KYC (prove KYC'd without revealing identity)

### Why Veiled Qualifies

**Selective Disclosure:**
- ✅ Core feature (not bolt-on)
- ✅ Proven in circuits
- ✅ Demonstrated in demo

**Compliance:**
- ✅ Not anonymous (nullifier tied to wallet)
- ✅ Auditable (can prove claims if needed)
- ✅ Abuse-resistant (nullifier prevents replay)

**Safe:**
- ✅ No criminal use cases (just auth)
- ✅ Responsible privacy (selective, not total)
- ✅ Aligns with regulations (can integrate KYC)

### Submission Checklist

- [ ] Selective disclosure documented
- [ ] Range mentioned in README (if integrated)
- [ ] Compliance features highlighted
- [ ] Balance range circuit as evidence
- [ ] NFT ownership circuit as evidence

---

## Multi-Bounty Submission Strategy

### How to Stack Bounties

**1. Single Codebase:**
```
One project, multiple angles:
- Track 02: Developer tooling focus
- Helius: Performance emphasis
- Quicknode: Open source emphasis
- Aztec: Non-financial emphasis
- Range: Compliance emphasis
```

**2. Submission Package:**
```
Main Submission (Track 02):
├─ Full pitch deck
├─ Complete video
└─ Comprehensive README

Bounty Submissions:
├─ Brief description + link to main
├─ Specific code evidence
└─ Highlight relevant features
```

**3. README Structure:**
```markdown
# Veiled

[Main description]

## Features
[General features]

## For Developers (Track 02)
[SDK examples]

## RPC Integrations
### Helius (Enhanced APIs)
[Helius section]

### Quicknode (Reliable RPC)
[Quicknode section]

## Technical Details
### Zero-Knowledge Circuits (Noir)
[Aztec section]

### Selective Disclosure
[Range section]

## Bounties
This project qualifies for:
- Track 02: Privacy Tooling
- Helius: Best Privacy Project
- Quicknode: Open Source Tooling
- Aztec: Non-Financial Use Case
- Range: Selective Disclosure
```

### Avoid Over-Claiming

**DON'T:**
- "Best privacy project ever" ❌
- "Revolutionary technology" ❌
- "Will change everything" ❌

**DO:**
- "First privacy auth for Solana" ✓
- "OAuth-like simplicity with ZK privacy" ✓
- "Developer-focused infrastructure" ✓

### Priority if Time Limited

```
Must Have (Week 1-3):
✅ Track 02 requirements
✅ Helius integration (easy)
✅ Quicknode support (easy)

Should Have (Week 4):
✅ Aztec/Noir circuits (already building)
✅ Range selective disclosure (already building)

Nice to Have:
○ Range SDK integration (if API available)
○ Additional bounties (check for new ones)
```

---

## Expected Bounty Outcomes

### Conservative Estimate ($9.5k)

**Win:**
- Helius ($5k) - 60% probability
- Quicknode ($3k) - 50% probability
- Range ($1.5k) - 70% probability

**Total:** $9.5k

**Why:**
- Small bounties less competitive
- Clear requirements, easy to meet
- Multiple projects likely win each

### Moderate Estimate ($22.5k)

**Win:**
- Track 02 ($15k) - 30% probability
- Helius ($5k) - 60% probability
- Aztec Non-Financial ($2.5k) - 40% probability

**Total:** $22.5k

**Why:**
- Track 02 competitive but Veiled fits perfectly
- Helius straightforward
- Non-financial unique angle for Aztec

### Best Case ($32k)

**Win:**
- Track 02 ($15k)
- Helius ($5k)
- Quicknode ($3k)
- Aztec Best Overall ($5k)
- Aztec Non-Financial ($2.5k) - might not stack
- Range ($1.5k)

**Total:** ~$32k

**Why:**
- Everything goes right
- Strong execution
- Great presentation
- Judges love it

### How to Maximize

**Focus Order:**
1. Track 02 (highest value)
2. Technical execution (enables all bounties)
3. Presentation (judges see quality)
4. Bounty-specific features (last)

**Time Allocation:**
```
70% - Build great project
20% - Present it well
10% - Bounty-specific polish
```

---

## Submission Timeline

**Day 7 of Week 4:**

```
Morning:
- [ ] Verify all code committed
- [ ] Test demo one last time
- [ ] Upload video to YouTube
- [ ] Finalize pitch deck

Early Afternoon:
- [ ] Submit Track 02 (main)
- [ ] Submit Helius bounty
- [ ] Submit Quicknode bounty
- [ ] Submit Aztec bounty
- [ ] Submit Range bounty

Late Afternoon:
- [ ] Tweet submission
- [ ] Post in Discord
- [ ] Share with network

Evening:
- [ ] Monitor for questions
- [ ] Prepare for Q&A
- [ ] Rest
```

---

## Post-Submission

**If Win:**
- Thank sponsors
- Share on social
- Continue development
- Plan mainnet launch

**If Lose:**
- Get feedback
- Improve project
- Resubmit to other hackathons
- Build community anyway

**Either Way:**
- Valuable learning
- Portfolio piece
- Open source contribution
- Potential startup

---

## Next Document

Read `06_TECHNOLOGY_DECISIONS.md` for justifications of all technology choices.
