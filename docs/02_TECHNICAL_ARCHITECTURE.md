# Technical Architecture

## System Overview

Veiled consists of **4 major components**, each solving a specific technical problem:

```
┌─────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                       │
│  ┌────────────────┐         ┌──────────────────┐            │
│  │  dApp Frontend │◄────────┤  @veiled/core    │            │
│  │  (React/etc)   │         │  (SDK)           │            │
│  └────────────────┘         └──────────────────┘            │
│                                    │                         │
│                                    ▼                         │
│                          ┌──────────────────┐               │
│                          │  ZK Proof        │               │
│                          │  Generator       │               │
│                          │  (Noir/WASM)     │               │
│                          └──────────────────┘               │
│                                    │                         │
└────────────────────────────────────┼─────────────────────────┘
                                     │
                                     ▼ (proof + nullifier)
                          ┌──────────────────┐
                          │  Solana Blockchain│
                          │  ┌──────────────┐ │
                          │  │ Veiled       │ │
                          │  │ Anchor       │ │
                          │  │ Program      │ │
                          │  └──────────────┘ │
                          │  ┌──────────────┐ │
                          │  │ Nullifier    │ │
                          │  │ Registry     │ │
                          │  └──────────────┘ │
                          └──────────────────┘
                                     │
                                     ▼ (authenticated session)
                          ┌──────────────────┐
                          │  dApp Backend    │
                          │  (Optional)      │
                          └──────────────────┘
```

---

## Component 1: ZK Circuits (Noir)

### What to Build

**Primary Circuit: `wallet_ownership.nr`**
```
INPUTS:
- Private: wallet_secret_key (never revealed)
- Public: domain_name (e.g., "app.example.com")
- Public: timestamp

OUTPUTS:
- Public: nullifier (unique per wallet + domain)
- Public: commitment (proves wallet ownership)

CONSTRAINTS:
1. Derive public key from secret key (EdDSA)
2. Compute domain-scoped nullifier = hash(secret_key, domain)
3. Compute commitment = hash(public_key, timestamp)
4. Verify signature on message
```

**Secondary Circuit: `nft_ownership.nr`**
```
INPUTS:
- Private: wallet_secret_key
- Private: merkle_proof (proves NFT in collection)
- Public: collection_address
- Public: domain_name

OUTPUTS:
- Public: nullifier
- Public: has_nft (boolean)

CONSTRAINTS:
1. Verify merkle proof (NFT exists in collection)
2. Prove wallet owns NFT (without revealing which)
3. Generate domain-scoped nullifier
```

**Tertiary Circuit: `balance_range.nr`**
```
INPUTS:
- Private: wallet_secret_key
- Private: actual_balance
- Public: minimum_required
- Public: domain_name

OUTPUTS:
- Public: nullifier
- Public: sufficient_balance (boolean)

CONSTRAINTS:
1. Prove actual_balance >= minimum_required
2. Do NOT reveal actual_balance
3. Generate domain-scoped nullifier
```

### Why Noir (Not Circom)

**Aztec Bounty Requirement:**
- $10k pool requires Noir circuits
- "Best non-financial use case" = authentication (perfect fit)

**Technical Benefits:**
- Rust-like syntax (safer, easier)
- Better Solana integration (WASM compilation)
- Groth16 proofs (compact, fast verification)
- Active development (Aztec-backed)

**What NOT to Build:**
- ❌ Custom ZK DSL (use Noir)
- ❌ Multiple proving systems (just Groth16)
- ❌ Trusted setup ceremony (use Noir's built-in)

### Deliverables

**Week 1:**
- `wallet_ownership.nr` - working, tested
- Proof generation script (CLI test)
- Verification key exported

**Week 2-3:**
- `nft_ownership.nr` - working
- `balance_range.nr` - working
- WASM compilation for browser

**Week 4:**
- Performance optimization (<5s proof gen)
- Circuit documentation

---

## Component 2: On-Chain Program (Anchor)

### What to Build

**Program Structure:**
```rust
// veiled/programs/veiled/src/lib.rs

#[program]
pub mod veiled {
    // Core instruction: Verify proof and register nullifier
    pub fn authenticate(
        ctx: Context<Authenticate>,
        proof: Vec<u8>,           // Groth16 proof bytes
        public_inputs: Vec<u8>,   // Nullifier + commitment
        domain: String,           // e.g., "app.example.com"
    ) -> Result<()>
    
    // Cleanup instruction: Expire old sessions
    pub fn expire_session(
        ctx: Context<ExpireSession>,
        nullifier: [u8; 32],
    ) -> Result<()>
}
```

**Account Structure:**
```rust
#[account]
pub struct NullifierRegistry {
    pub nullifier: [u8; 32],      // Unique identifier
    pub domain: String,            // Which dApp
    pub timestamp: i64,            // When authenticated
    pub expiry: i64,               // When session expires
    pub commitment: [u8; 32],      // Public commitment
}

#[account]
pub struct VerificationKey {
    pub key_data: Vec<u8>,         // Groth16 VK
    pub circuit_type: u8,          // 0=wallet, 1=nft, 2=balance
}
```

### Why Anchor (Not Native Solana)

**Development Speed:**
- Anchor handles account serialization
- Built-in CPI helpers
- IDL generation for SDK

**Security:**
- Anchor checks prevent common bugs
- Signer verification automatic
- Rent-exempt enforcement

**Ecosystem Compatibility:**
- Expected by Solana developers
- Works with all major tools
- Easy deployment via Anchor CLI

### What NOT to Build

❌ **Custom cryptography** - Use arkworks-rs for Groth16 verification
❌ **Token logic** - No native token, keep simple
❌ **Complex session management** - Just nullifier + expiry
❌ **Admin controls** - No pause, no upgrades (trustless)

### Deliverables

**Week 2:**
- Anchor project initialized
- `authenticate` instruction working
- Unit tests passing
- Deploy to devnet

**Week 3:**
- `expire_session` instruction
- Integration tests with SDK
- Gas optimization

**Week 4:**
- Security review
- Deploy to mainnet-beta (if ready)
- Program documentation

---

## Component 3: SDK (@veiled/core)

### What to Build

**Core API:**
```typescript
// @veiled/core/src/index.ts

export class VeiledAuth {
    constructor(config: VeiledConfig)
    
    // Primary method: Generate proof + submit to chain
    async signIn(options: SignInOptions): Promise<AuthResult>
    
    // Verify existing session
    async verifySession(nullifier: string): Promise<SessionStatus>
    
    // Sign out (expire nullifier)
    async signOut(): Promise<void>
}

export interface SignInOptions {
    // What to prove
    requirements: {
        wallet: boolean,              // Always true
        nft?: {
            collection: PublicKey,
            // prove ownership without revealing which
        },
        balance?: {
            minimum: number,
            token?: PublicKey,        // undefined = SOL
        }
    },
    
    // Where (for nullifier scoping)
    domain: string,                   // e.g., "myapp.com"
    
    // How long session lasts
    expiry?: number,                  // seconds, default 86400
}

export interface AuthResult {
    success: boolean,
    nullifier: string,                // Unique per wallet+domain
    proof: string,                    // Hex-encoded proof
    commitment: string,               // Public commitment
    txSignature?: string,             // If submitted on-chain
}
```

**Wallet Adapter Integration:**
```typescript
// Uses Solana Wallet Adapter standard
import { useWallet } from '@solana/wallet-adapter-react';

const { wallet, signMessage } = useWallet();
const veiled = new VeiledAuth({ wallet });
```

**RPC Provider Abstraction:**
```typescript
// Support multiple RPC providers
const veiled = new VeiledAuth({
    rpcProvider: 'helius',     // or 'quicknode' or custom
    rpcApiKey: process.env.HELIUS_KEY,
});
```

### Why TypeScript SDK (Not Rust)

**Browser Compatibility:**
- Needs to run in web browsers
- WASM compilation from Noir
- No server-side requirement

**Developer Familiarity:**
- Most web3 devs use TypeScript
- Matches Solana Web3.js ecosystem
- Easy integration with React/Svelte/etc

**Helius/Quicknode Bounties:**
- Both want SDK usage
- TypeScript makes RPC integration natural

### What NOT to Build

❌ **Wallet implementation** - Use existing wallets (Phantom/Backpack)
❌ **RPC node** - Use Helius/Quicknode
❌ **Backend server** - Pure client-side (P2P with blockchain)
❌ **Complex state management** - Keep SDK stateless

### Deliverables

**Week 3:**
- `@veiled/core` package structure
- `VeiledAuth` class working
- WASM integration (Noir proofs)
- Basic documentation

**Week 4:**
- Optional thin framework wrappers (post-MVP)
- Example integrations
- Published to npm (or GitHub)

---

## Component 4: Demo Application

### What to Build

**NFT-Gated Chat Application**

**Why This Demo:**
- Shows selective disclosure (prove NFT, hide which)
- Demonstrates cross-site unlinkability (different rooms = different nullifiers)
- Production-like use case (actual utility)
- Visually demonstrable (judges can try it)

**Frontend (SvelteKit):**
```
/routes/
  /                     -> Landing page (explain Veiled)
  /demo                 -> Demo selector
  /demo/chat            -> NFT-gated chat room
  /demo/comparison      -> Side-by-side: normal auth vs Veiled
```

**Features:**
- Connect wallet (Phantom, Backpack, Solflare)
- Select NFT collection requirement (e.g., "Okay Bears")
- Generate ZK proof (show progress bar)
- Join chat if proof valid
- Show: Chat sees nullifier, NOT wallet address
- Comparison mode: Show what normal auth exposes

**Backend (Optional - Hono + Bun):**
```typescript
// Simple WebSocket server for chat
// Could also use client-side P2P (libp2p)
// But centralized easier for demo
```

### Why SvelteKit (Not Next.js)

**User Preference:**
- Specified in preferences
- Already familiar
- Fast development

**Technical Benefits:**
- Lighter than Next.js
- Better DX for solo dev
- TailwindCSS integration easy

### What NOT to Build

❌ **Complex chat features** - No DMs, no moderation, bare minimum
❌ **User accounts** - No signup, no passwords, just wallet + proof
❌ **Persistence** - Ephemeral chat OK (reset on refresh)
❌ **Mobile app** - Web only (Capacitor/Tauri can wait)

### Deliverables

**Week 3:**
- Landing page
- Basic demo working
- Can generate proof, see nullifier

**Week 4:**
- Polished UI
- Comparison mode
- Demo video recorded (2-4min)
- Deployed to veiled.vercel.app

---

## Cross-Component Data Flow

### Sign-In Flow

```
1. User clicks "Sign in with Veiled" on dApp
   └─> dApp calls veiled.signIn({ requirements: {...} })

2. SDK detects wallet via Wallet Adapter
   └─> Prompts user to connect if not connected

3. SDK fetches wallet data via Helius/Quicknode
   └─> If NFT required: fetch NFTs
   └─> If balance required: fetch balance

4. SDK generates ZK proof in browser (Noir WASM)
   └─> Input: wallet secret key (from signMessage)
   └─> Input: requirements (NFT, balance, etc)
   └─> Output: proof + nullifier
   └─> Time: <5 seconds target

5. SDK submits transaction to Solana
   └─> Calls veiled_program.authenticate(proof, nullifier, domain)
   └─> On-chain verifies proof (Groth16)
   └─> On-chain checks nullifier not used
   └─> On-chain stores nullifier + expiry

6. SDK returns AuthResult to dApp
   └─> dApp receives nullifier (NOT wallet address)
   └─> dApp creates session with nullifier as ID
   └─> User authenticated privately
```

### Verification Flow

```
1. User returns to dApp
   └─> dApp checks local storage for nullifier

2. dApp calls veiled.verifySession(nullifier)
   └─> SDK queries Solana for nullifier account

3. On-chain check
   └─> Does nullifier exist?
   └─> Is expiry > now?
   └─> Return session status

4. If valid:
   └─> User remains signed in
   └─> No re-authentication needed

5. If expired:
   └─> Prompt user to sign in again
   └─> Generate new proof
```

---

## Security Architecture

### Threat Model

**What Veiled PREVENTS:**
✅ Wallet address exposure to dApps
✅ Cross-site tracking (different nullifiers per domain)
✅ Transaction history snooping
✅ Net worth stalking
✅ NFT collection doxing

**What Veiled DOES NOT Prevent:**
❌ On-chain activity tracking (blockchain still public)
❌ IP address correlation (use VPN if concerned)
❌ Wallet compromise (secure your keys)
❌ Phishing (always verify domain)

### Attack Vectors & Mitigations

**1. Nullifier Replay Attack**
- Attack: Reuse same nullifier on multiple domains
- Mitigation: Nullifier = hash(secret_key, domain) - domain-scoped
- Implementation: Store nullifiers on-chain, check uniqueness

**2. Proof Forgery**
- Attack: Submit fake proof without owning wallet
- Mitigation: Groth16 verification on-chain (cryptographically sound)
- Implementation: Use arkworks-rs, audited library

**3. Sybil Attack**
- Attack: Create many fake identities
- Mitigation: Rate limit by nullifier (not IP)
- Implementation: On-chain nullifier registry prevents double-use

**4. Front-Running**
- Attack: Watch mempool, submit proof before original user
- Mitigation: Proof includes signature, tied to wallet
- Implementation: Verify signature in circuit

**5. Domain Spoofing**
- Attack: Phishing site uses same domain in proof
- Mitigation: User must verify domain in wallet UI
- Implementation: Wallet adapter shows domain in sign request

### What NOT to Build (Security)

❌ **Custom cryptography** - ONLY use audited libraries
❌ **Proof caching** - Could leak info, generate fresh each time
❌ **Server-side key storage** - Client-side only (non-custodial)

---

## Performance Requirements

### Target Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Proof generation | <5 seconds | UX - users won't wait longer |
| Proof verification | <200ms | Solana block time is 400ms |
| SDK bundle size | <500KB | Web performance, mobile users |
| On-chain storage | <1KB/user | Cost efficiency at scale |
| Transaction cost | <$0.01 | User pays, must be cheap |

### Optimization Strategies

**Proof Generation:**
- WASM compilation (not JS)
- Worker threads (don't block UI)
- Progressive proof generation (show progress)

**On-Chain:**
- State compression for nullifiers (if scaling)
- Batch verification (if many proofs)
- Optimize account sizes (pack data tight)

**SDK:**
- Tree-shaking (only import what's used)
- Lazy loading (load WASM on-demand)
- Cache verification keys (don't fetch every time)

### What NOT to Optimize (Yet)

❌ **Multi-threading** - Single-threaded fine for MVP
❌ **Custom WASM** - Noir's output good enough
❌ **Assembly optimization** - Premature, focus on correctness

---

## Testing Strategy

### What to Test

**ZK Circuits:**
- ✅ Valid proofs verify correctly
- ✅ Invalid proofs rejected
- ✅ Nullifier uniqueness (same wallet + domain = same nullifier)
- ✅ Cross-domain unlinkability (different domains = different nullifiers)

**On-Chain Program:**
- ✅ Valid proof authenticates successfully
- ✅ Invalid proof rejected
- ✅ Duplicate nullifier rejected
- ✅ Expired session cleaned up
- ✅ Gas costs reasonable

**SDK:**
- ✅ Integration with Phantom wallet
- ✅ Integration with Helius RPC
- ✅ Proof generation completes in <5s
- ✅ Error handling (wallet not connected, RPC failure)

**Demo App:**
- ✅ End-to-end flow works
- ✅ UI responsive
- ✅ Works across browsers (Chrome, Firefox)

### What NOT to Test (Yet)

❌ **Fuzz testing** - Overkill for MVP
❌ **Load testing** - No users yet
❌ **Security audit** - Post-hackathon if successful

---

## Deployment Architecture

### Devnet (Week 2-3)

```
Programs: Solana Devnet
Frontend: Local dev server (Vite)
RPC: Devnet endpoint (free)
Purpose: Development + testing
```

### Mainnet-Beta (Week 4 - Optional)

```
Programs: Solana Mainnet-Beta
Frontend: Vercel (veiled.vercel.app)
RPC: Helius/Quicknode (API keys)
Purpose: Demo for judges + bounty proof
```

**Why NOT Deploy to Mainnet Yet:**
- No security audit
- No user testing
- Hackathon doesn't require mainnet
- Can deploy after winning if successful

### What NOT to Deploy

❌ **Backend servers** - Keep it client-side
❌ **Databases** - On-chain is the database
❌ **CDN** - Vercel handles it
❌ **Monitoring** - Not needed for demo

---

## Technology Decisions Summary

| Component | Choice | Reason |
|-----------|--------|--------|
| **ZK Circuits** | Noir | Aztec bounty + better DX |
| **Proving System** | Groth16 | Small proofs, fast verify |
| **Smart Contract** | Anchor | Standard Solana framework |
| **SDK Language** | TypeScript | Web ecosystem standard |
| **Frontend** | SvelteKit | User preference + fast dev |
| **CSS** | TailwindCSS | User preference + utility-first |
| **RPC** | Helius/Quicknode | Bounty requirements |
| **Wallet** | Wallet Adapter | Standard Solana wallets |
| **Deployment** | Vercel | Free, fast, easy |

---

## Dependencies

### Critical Path Dependencies

```
Week 1: ZK Circuits
  └─> Must complete before Week 2 (on-chain needs VK)
  
Week 2: On-Chain Program
  └─> Must complete before Week 3 (SDK needs program)
  
Week 3: SDK + Demo
  └─> Must complete before Week 4 (need demo for video)
  
Week 4: Polish + Submission
  └─> Dependent on all above
```

### External Dependencies

- Noir compiler (install Week 1)
- Anchor framework (install Week 1)
- Helius API key (get Week 2)
- Quicknode account (get Week 2)
- Vercel account (get Week 3)

---

## Next Document

Read `03_CORE_FEATURES.md` for detailed feature requirements and justifications.
