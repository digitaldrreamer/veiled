# Technology Decisions - Why These Choices

## Decision Framework

Every technology choice in Veiled answers three questions:

1. **Does it enable the core feature?** (Must work)
2. **Does it help win bounties?** (Strategic)
3. **Can I build it in 4 weeks?** (Feasible)

---

## Zero-Knowledge: Noir vs Circom

### Decision: Noir

**Alternatives Considered:**
- Circom (most popular)
- Halo2 (Ethereum-focused)
- RISC Zero (zkVM)
- Miden (Polygon)

### Why Noir

**Bounty Requirement:**
```
Aztec offers $10k for best Noir projects.
Using circom = ineligible.
Using Noir = eligible.

Simple math: Noir worth $2.5k-$10k
```

**Technical Benefits:**
| Feature | Noir | Circom |
|---------|------|--------|
| Syntax | Rust-like (safe) | JS-like (error-prone) |
| Proving system | Groth16 (fast) | Groth16 (fast) |
| WASM support | ✓ Native | ✓ Via snarkjs |
| Solana integration | ✓ Better | ○ OK |
| Learning curve | Moderate | Moderate |
| Maturity | Growing | Established |

**Development Experience:**
```noir
// Noir is more readable
let nullifier = poseidon::bn254::hash_2([secret, domain]);

// vs Circom
signal output nullifier;
component hasher = Poseidon(2);
hasher.inputs[0] <== secret;
hasher.inputs[1] <== domain;
nullifier <== hasher.out;
```

**Why NOT Circom:**
- Disqualifies from Aztec bounty (-$2.5k minimum)
- Slightly older syntax
- No compelling advantage over Noir

**Why NOT Others:**
- Halo2: Ethereum-focused, less Solana support
- RISC Zero: zkVM overkill for simple proofs
- Miden: Polygon, not Solana

### Risk & Mitigation

**Risk:** Noir less mature than circom
**Mitigation:** Active Aztec development, good docs, Discord support

**Risk:** Fewer examples
**Mitigation:** Simpler circuits, can port circom concepts

**Verdict:** Noir worth it for bounty + DX

---

## Smart Contracts: Anchor vs Native

### Decision: Anchor

**Alternatives Considered:**
- Native Solana (bare Rust)
- Solang (Solidity on Solana)
- Seahorse (Python on Solana)

### Why Anchor

**Ecosystem Standard:**
```
Most Solana programs use Anchor.
Judges expect Anchor.
Using native = "Why not Anchor?"
Using Anchor = No questions.
```

**Development Speed:**
| Task | Native | Anchor |
|------|--------|--------|
| Account serialization | Manual (200 lines) | Automatic (#[account]) |
| Signer checks | Manual (20 lines) | Automatic (#[account(signer)]) |
| Rent checks | Manual (10 lines) | Automatic (space = X) |
| Tests | Manual setup | Built-in framework |
| IDL generation | None | Automatic |
| **Total time saved** | - | **30-40% faster** |

**Code Comparison:**
```rust
// Native Solana (verbose)
let account = next_account_info(accounts_iter)?;
if !account.is_signer {
    return Err(ProgramError::MissingRequiredSignature);
}
let mut data = account.try_borrow_mut_data()?;
let nullifier_account: NullifierAccount = borsh::try_from_slice(&data)?;

// Anchor (concise)
#[account(mut)]
pub authority: Signer<'info>,
```

**Why NOT Native:**
- 2x development time
- More error-prone
- No compelling benefit (circuits are complex enough)

**Why NOT Alternatives:**
- Solang: Solidity baggage, less Solana-idiomatic
- Seahorse: Experimental, low adoption

### Risk & Mitigation

**Risk:** Anchor abstractions hide complexity
**Mitigation:** Learn what Anchor does under hood (good docs)

**Risk:** Anchor adds dependency
**Mitigation:** Well-maintained, Coral-backed

**Verdict:** Anchor = correct choice for speed + safety

---

## SDK Language: TypeScript vs Rust

### Decision: TypeScript

**Alternatives Considered:**
- Rust (native Solana)
- Python (data science friendly)
- Go (performance)

### Why TypeScript

**Browser Requirement:**
```
Veiled must run in browsers.
Rust → WASM (heavy, slow compile)
TypeScript → Native JS (fast, light)

WASM is for circuits (Noir).
SDK should be pure JS/TS.
```

**Developer Ecosystem:**
| Metric | TypeScript | Rust |
|--------|------------|------|
| Web3 developers | 80%+ | 20% |
| React/Vue/Svelte | Native | Via WASM |
| npm ecosystem | Huge | Growing |
| Hiring/collaboration | Easy | Harder |
| Docs/examples | Abundant | Limited |

**Integration Examples:**
```typescript
// TypeScript integrates naturally
import { useWallet } from '@solana/wallet-adapter-react';
import { VeiledAuth } from '@veiled/core';

// Rust requires bindings
#[wasm_bindgen]
pub fn sign_in() -> JsValue {
    // Complex FFI
}
```

**Why NOT Rust:**
- Would need WASM compilation (slow development)
- Larger bundle size (worse UX)
- Fewer web developers can contribute
- No compelling performance benefit (RPC is bottleneck, not SDK)

**Why NOT Python:**
- No browser support (server-side only)
- Not Web3 ecosystem standard

### Risk & Mitigation

**Risk:** TypeScript less performant
**Mitigation:** Proof generation in WASM (Noir), SDK just orchestration

**Risk:** Type safety weaker than Rust
**Mitigation:** Strict TypeScript config, comprehensive tests

**Verdict:** TypeScript = only viable choice for browser SDK

---

## Frontend: SvelteKit vs Next.js

### Decision: SvelteKit

**Alternatives Considered:**
- Next.js (most popular)
- Remix (rising)
- Vanilla Vite (minimal)
- Nuxt (Vue)

### Why SvelteKit

**User Preference:**
```
User specified: "I work with SvelteKit"
Faster development when familiar.
Solo developer = use your best tool.
```

**Technical Benefits:**
| Feature | SvelteKit | Next.js |
|---------|-----------|---------|
| Bundle size | Smaller | Larger |
| Learning curve | Lower | Moderate |
| Performance | Excellent | Excellent |
| DX | Great | Great |
| Ecosystem | Growing | Huge |

**Development Speed:**
```
Known framework: 1x speed
Unknown framework: 0.5x speed (learning time)

4 weeks * 0.5 = 2 weeks effective time
Better to use SvelteKit efficiently.
```

**Why NOT Next.js:**
- Judges don't care about framework choice
- Demo quality matters, not which framework
- Learning Next.js = time sink with no ROI

**Why NOT Remix:**
- Even smaller ecosystem than Svelte
- No significant advantage

### Bounty Implications

**Does Framework Choice Affect Bounties?**
- Track 02: No (judges evaluate SDK, not demo framework)
- Helius: No (RPC agnostic)
- Quicknode: No (RPC agnostic)
- Aztec: No (circuit-focused)
- Range: No (compliance-focused)

**Answer: Framework is irrelevant to winning**

### Risk & Mitigation

**Risk:** Less familiar to judges (if they're Next.js devs)
**Mitigation:** Code quality speaks for itself

**Risk:** Fewer examples to reference
**Mitigation:** User already knows SvelteKit patterns

**Verdict:** SvelteKit = best for solo developer efficiency

---

## CSS: TailwindCSS vs Alternatives

### Decision: TailwindCSS

**Alternatives Considered:**
- CSS Modules
- Styled Components
- Vanilla CSS
- DaisyUI (Tailwind + components)

### Why TailwindCSS

**User Preference:**
```
User specified: "I work with TailwindCSS"
Fast prototyping.
No design decisions needed.
```

**Practical Benefits:**
- Utility-first = fast iteration
- No CSS files = less context switching
- Consistent spacing/colors
- Responsive utilities built-in

**Why NOT Others:**
- CSS Modules: More files, more overhead
- Styled Components: React-specific
- Vanilla CSS: Slow, requires design skills
- DaisyUI: Could use, but Tailwind alone sufficient

### Bounty Implications

**Does CSS Choice Affect Bounties?**
No. Judges evaluate:
- Functionality ✓
- Code quality ✓
- Documentation ✓
- Presentation ✓

Not:
- CSS methodology ✗

### Verdict

TailwindCSS = correct choice for speed + user familiarity

---

## RPC Providers: Helius vs Quicknode vs Custom

### Decision: Support All Three

**Why NOT Pick One:**
```
Helius bounty: $5k
Quicknode bounty: $3k
Supporting both: $8k

Development cost: 2-3 hours (abstraction layer)
ROI: $8k / 3 hours = $2,666/hour

Obviously worth it.
```

**Technical Implementation:**
```typescript
interface RPCProvider {
    getNFTs(wallet: PublicKey): Promise<NFT[]>;
    getBalance(wallet: PublicKey, token?: PublicKey): Promise<number>;
    sendTransaction(tx: Transaction): Promise<string>;
}

class HeliusProvider implements RPCProvider { ... }
class QuicknodeProvider implements RPCProvider { ... }
class CustomProvider implements RPCProvider { ... }
```

**User Experience:**
```typescript
// Developer chooses provider
const veiled = new VeiledAuth({
    rpcProvider: 'helius',  // or 'quicknode' or 'custom'
    rpcApiKey: process.env.API_KEY
});
```

### Why Helius

**Pros:**
- Enhanced APIs (getAssetsByOwner, getParsedTokenAccountsByOwner)
- Better performance
- Free tier generous
- $5k bounty

**Cons:**
- Requires API key (but free tier OK)

### Why Quicknode

**Pros:**
- Reliable infrastructure
- Standard Solana RPC
- $3k bounty

**Cons:**
- No enhanced APIs (use standard RPC)

### Why Support Custom

**Pros:**
- Users with own RPC nodes
- Self-hosted deployments
- Open source principle

**Cons:**
- Must handle rate limiting themselves

### Verdict

Support all three = $8k bounties + user flexibility

---

## Wallet Integration: Wallet Adapter vs Custom

### Decision: Wallet Adapter

**Alternatives Considered:**
- Custom wallet integration
- Web3Auth (abstraction)
- Phantom SDK directly

### Why Wallet Adapter

**Ecosystem Standard:**
```
Wallet Adapter supports:
- Phantom (12M+ users)
- Backpack (rising)
- Solflare (established)
- Glow (growing)
- Ledger (hardware)

Custom integration = only one wallet
Wallet Adapter = all wallets
```

**Code Simplicity:**
```typescript
// Wallet Adapter (5 lines)
import { useWallet } from '@solana/wallet-adapter-react';
const { wallet, signMessage } = useWallet();

// Custom (50+ lines)
import { Phantom } from '@phantom/sdk';
// ... manual connection handling
// ... manual signing logic
// ... error handling
```

**Why NOT Custom:**
- Locks users to one wallet
- More development time
- Less ecosystem compatibility

**Why NOT Web3Auth:**
- Abstracts too much (we need raw signatures for ZK)
- Another dependency
- Not Solana-specific

### Verdict

Wallet Adapter = only sensible choice

---

## Deployment: Vercel vs Self-Hosted

### Decision: Vercel

**Alternatives Considered:**
- AWS (EC2, S3, CloudFront)
- DigitalOcean
- Netlify
- Self-hosted

### Why Vercel

**Free Tier:**
```
Cost: $0
Features:
- Automatic deployments
- Preview URLs
- CDN
- HTTPS
- Custom domains

AWS equivalent: $20-50/month
```

**Developer Experience:**
```bash
# Vercel (one command)
vercel deploy

# AWS (many commands)
aws s3 sync dist s3://bucket
aws cloudfront create-invalidation
# ... 10 more steps
```

**User Familiarity:**
```
User specified: "Sometimes Vercel"
Known tool = faster deployment.
```

**Why NOT Others:**
- AWS: Overkill, expensive, complex
- DigitalOcean: Good but not free
- Netlify: Similar to Vercel (either fine)
- Self-hosted: Maintenance burden

### Verdict

Vercel = free, fast, familiar

---

## Testing: Vitest vs Jest

### Decision: Vitest

**Why Vitest:**
- Faster (native ESM)
- Vite-compatible (SvelteKit uses Vite)
- Modern API (async/await first)
- TypeScript native

**Why NOT Jest:**
- Slower
- CJS default
- More config

**Note:** Testing priority is LOW for hackathon
- Focus: Working code
- Not: 100% coverage

---

## Documentation: Markdown vs Dedicated Tool

### Decision: Markdown in GitHub

**Why Markdown:**
```
Time to write docs:
- Markdown: 2 hours
- GitBook: 4 hours (setup + writing)
- Docusaurus: 6 hours (setup + styling + writing)

Hackathon = maximize code, minimize docs overhead
```

**Structure:**
```
README.md          → Overview, quick start
ARCHITECTURE.md    → Technical deep dive
API.md             → SDK reference
CONTRIBUTING.md    → For collaborators
```

**Why NOT Dedicated Tools:**
- GitBook: Overkill for MVP
- Docusaurus: Great but time-intensive setup
- Mintlify: New, untested

### Verdict

Markdown = fast, sufficient, open source standard

---

## Version Control: Git + GitHub

### Decision: Git + GitHub

**Why GitHub:**
- Industry standard
- Free for public repos
- CI/CD via Actions
- Issue tracking
- Stars/forks = social proof

**Why NOT Alternatives:**
- GitLab: No advantage for open source
- Bitbucket: Less popular
- Self-hosted: Unnecessary

### Verdict

GitHub = default choice, no debate needed

---

## Package Management: npm vs pnpm vs yarn

### Decision: npm

**Why npm:**
- Comes with Node.js
- Universal compatibility
- Simplest for contributors

**Why NOT pnpm:**
- Slightly faster (marginal)
- Not standard enough

**Why NOT yarn:**
- Not significant benefit

### Verdict

npm = simplest, works everywhere

---

## Proving System: Groth16 vs PLONK

### Decision: Groth16 (via Noir)

**Why Groth16:**
- Small proofs (~200 bytes)
- Fast verification (<200ms)
- Trusted setup OK (Noir provides)

**Why NOT PLONK:**
- Larger proofs
- Slower verification
- Universal setup not needed (circuits fixed)

**Note:** Noir uses Groth16 by default
- Not actually a choice to make
- Just using Noir's defaults

### Verdict

Groth16 = Noir default, optimal for use case

---

## Database: On-Chain vs Off-Chain

### Decision: On-Chain Only

**Why On-Chain:**
```
Nullifier storage MUST be on-chain:
- Prevents double-use
- Trustless verification
- No database to maintain

Session data can be on-chain:
- Small (138 bytes per user)
- Cheap (<$0.01 per auth)
- Eliminates infrastructure
```

**Why NOT Off-Chain:**
- Centralization risk
- Server costs
- Maintenance burden
- Trust assumptions

**What About Performance:**
- Solana is database (400ms latency)
- RPC caches (faster for reads)
- Good enough for auth use case

### Verdict

On-chain = trustless, simple, cheaper

---

## Monitoring: None (for MVP)

### Decision: No Monitoring

**Why Skip:**
```
Hackathon priorities:
1. Working demo
2. Good presentation
3. Clean code

NOT priorities:
- Uptime monitoring
- Error tracking
- Analytics

Add post-hackathon if win.
```

**What If Something Breaks:**
- Demo day: Test beforehand
- Submission deadline: Manual checks
- Post-submission: Fix if reported

### Verdict

No monitoring = correct scope prioritization

---

## Technology Stack Summary

```
┌─────────────────────────────────────────┐
│           FINAL TECH STACK              │
├─────────────────────────────────────────┤
│ ZK Circuits:     Noir (Aztec bounty)   │
│ Smart Contract:  Anchor (speed)        │
│ SDK Language:    TypeScript (browser)  │
│ Frontend:        SvelteKit (familiar)  │
│ CSS:             TailwindCSS (fast)    │
│ RPC:             Helius/Quicknode      │
│ Wallet:          Wallet Adapter        │
│ Deployment:      Vercel (free)         │
│ Testing:         Vitest (modern)       │
│ Docs:            Markdown (simple)     │
│ Version Control: GitHub (standard)     │
│ Package Manager: npm (universal)       │
│ Proving System:  Groth16 (fast)        │
│ Database:        On-chain (trustless)  │
│ Monitoring:      None (MVP scope)      │
└─────────────────────────────────────────┘
```

---

## Decisions NOT Made (Intentionally)

### What We're NOT Deciding

**Security Audit Firm:**
- Post-hackathon concern
- If win, then choose auditor

**Mainnet Launch Plan:**
- Post-hackathon concern
- Devnet sufficient for demo

**Token Economics:**
- No token needed
- Pure infrastructure play

**Governance Model:**
- Open source (MIT)
- No DAO needed for MVP

**Business Model:**
- Free and open source
- Monetization later (if at all)

### Why NOT Decide These

```
Hackathon goal: Working demo
Post-hackathon: Scale if successful

Premature optimization = waste time
Build fast, decide later.
```

---

## Risk Assessment

### Technology Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Noir issues | 20% | High | Active community, fallback to simpler circuits |
| WASM problems | 30% | Medium | Test early, optimize later |
| RPC rate limits | 40% | Low | Free tiers generous, can upgrade |
| Wallet adapter bugs | 10% | Medium | Well-tested library, stable |
| Vercel outage | 5% | Low | Local backup, can redeploy |

### Mitigation Strategy

**General Approach:**
1. Test critical paths early (Week 1-2)
2. Have fallback options (simpler circuits if needed)
3. Buffer time (Day 7 each week)
4. Scope control (cut features, not quality)

---

## Technology Trade-offs

### What We Sacrificed

**Performance:**
- TypeScript slower than Rust
- Acceptable: RPC is bottleneck, not SDK

**Ecosystem Size:**
- Svelte smaller than React
- Acceptable: Developer productivity > popularity

**Cutting Edge:**
- Not using newest ZK tech (STARKs, etc)
- Acceptable: Groth16 mature, proven

### What We Gained

**Speed:**
- Familiar tools = 2x faster development
- Simple architecture = fewer bugs

**Maintainability:**
- Standard tools = easier for others to contribute
- Clear patterns = less "magic"

**Bounty Alignment:**
- Noir = Aztec bounty
- Multi-RPC = Helius + Quicknode bounties
- Open source = Quicknode + community

---

## Final Thoughts

### Decision Philosophy

```
Perfect is the enemy of done.
Done is the enemy of submitted.
Submitted is the enemy of won.

Choose technologies that:
1. Enable submission ✓
2. Enable winning ✓
3. Don't distract from goal ✓

Everything else is negotiable.
```

### Key Learnings

**For Solo Developer:**
- Use familiar tools (SvelteKit, TailwindCSS)
- Use standard tools (Anchor, Wallet Adapter)
- Use strategic tools (Noir for bounty)

**For Hackathon:**
- Speed > perfection
- Working > polished
- Submitted > perfect

**For Winning:**
- Presentation = 20% of work
- Bounty alignment = strategic
- Novel idea + good execution = win

---

## Appendix: Tools Not Chosen

**Why NOT:**
- Hardhat: Ethereum tool
- Truffle: Ethereum tool
- React Native: No mobile needed
- Flutter: No mobile needed
- Docker: No deployment complexity
- Kubernetes: Massive overkill
- GraphQL: REST sufficient
- Redis: On-chain is cache
- PostgreSQL: On-chain is DB
- MongoDB: On-chain is DB
- Sentry: No monitoring needed
- DataDog: No monitoring needed
- Stripe: No payments needed
- Auth0: Building auth ourselves
- Firebase: Centralization defeats purpose
- AWS Lambda: No server needed
- Cloudflare Workers: No server needed

**Common Theme:**
Most tools solve problems Veiled doesn't have.
On-chain = database + cache + backend.
SDK = client-side only.

Simplicity wins.
