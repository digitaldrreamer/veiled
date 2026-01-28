# Core Features - What to Build and Why

## Feature Priority Matrix

```
MUST HAVE (Week 1-2)
├─ Basic wallet ownership proof
├─ On-chain verification
├─ Nullifier registry
└─ Domain scoping

SHOULD HAVE (Week 3)
├─ NFT ownership proof
├─ Balance range proof
├─ SDK with simple API
└─ Basic demo app

NICE TO HAVE (Week 4 if time)
├─ Session expiry
├─ Multiple wallet support
├─ Framework integrations
└─ Comparison mode in demo

WON'T HAVE (Post-hackathon)
├─ Token gating beyond NFTs
├─ Social graph integration
├─ Mobile apps
└─ Production monitoring
```

---

## Core Feature 1: Wallet Ownership Proof

### What to Build

**User Story:**
"As a user, I want to prove I control a Solana wallet without revealing which wallet I control, so that websites can authenticate me without seeing my financial history."

**Technical Implementation:**

**Circuit: `wallet_ownership.nr`**
```noir
// Prove wallet ownership without revealing address

fn main(
    // PRIVATE (never revealed)
    secret_key: Field,
    
    // PUBLIC (visible to verifier)
    domain: pub Field,
    timestamp: pub Field
) -> pub (Field, Field) {
    
    // Derive public key from secret key
    let public_key = derive_pubkey(secret_key);
    
    // Generate domain-scoped nullifier
    // Same wallet + same domain = same nullifier
    // Same wallet + different domain = different nullifier
    let nullifier = poseidon_hash([secret_key, domain]);
    
    // Generate commitment
    let commitment = poseidon_hash([public_key, timestamp]);
    
    // Return outputs
    (nullifier, commitment)
}
```

**On-Chain Handler:**
```rust
pub fn authenticate_wallet(
    ctx: Context<Authenticate>,
    proof: Vec<u8>,
    nullifier: [u8; 32],
    commitment: [u8; 32],
    domain: String,
) -> Result<()> {
    // Verify Groth16 proof
    verify_proof(&proof, &[nullifier, commitment])?;
    
    // Check nullifier not already used
    require!(!is_nullifier_used(&nullifier, &domain), DuplicateNullifier);
    
    // Store nullifier
    register_nullifier(nullifier, domain, commitment)?;
    
    Ok(())
}
```

**SDK Method:**
```typescript
const result = await veiled.signIn({
    requirements: { wallet: true },
    domain: "myapp.com"
});
// Returns: { nullifier, commitment, txSignature }
// Does NOT return wallet address
```

### Why This Feature

**Hackathon Alignment:**
- Core privacy primitive (proves Track 02 understanding)
- Selective disclosure (aligns with "responsible privacy")
- Foundation for all other features

**Technical Necessity:**
- Must have basic proof before building advanced proofs
- Nullifier generation critical for cross-site unlinkability
- Domain scoping prevents tracking

**User Value:**
- Solves core problem: authenticate without doxing
- Works for 80% of use cases (simple auth)
- Fast to implement (1 week)

### Success Criteria

✅ Proof generates in <5 seconds
✅ On-chain verification succeeds
✅ Same wallet + same domain = same nullifier (tested)
✅ Same wallet + different domain = different nullifier (tested)
✅ Demo shows wallet address never exposed

---

## Core Feature 2: Domain-Scoped Nullifiers

### What to Build

**User Story:**
"As a user, I want different websites to see different identifiers for me, so that they cannot collude to track my activity across the web."

**Nullifier Generation Logic:**
```typescript
// In SDK
function generateNullifier(
    walletSecretKey: Uint8Array,
    domain: string
): string {
    // Domain normalized (lowercase, no protocol)
    const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, '');
    
    // Nullifier = hash(secret_key || domain)
    const nullifier = poseidon([
        walletSecretKey,
        stringToField(normalizedDomain)
    ]);
    
    return nullifier.toString();
}
```

**On-Chain Storage:**
```rust
#[account]
pub struct NullifierAccount {
    pub nullifier: [u8; 32],        // Unique ID
    pub domain: String,              // "app.example.com"
    pub created_at: i64,             // Unix timestamp
    pub expires_at: i64,             // When session ends
    pub commitment: [u8; 32],        // Public commitment from proof
}

// PDA seed: [b"nullifier", nullifier.as_ref(), domain.as_ref()]
```

**Verification Method:**
```typescript
async function verifySession(
    nullifier: string,
    domain: string
): Promise<boolean> {
    // Fetch nullifier account from Solana
    const account = await fetchNullifierAccount(nullifier, domain);
    
    if (!account) return false;
    if (account.expires_at < Date.now() / 1000) return false;
    
    return true;
}
```

### Why This Feature

**Privacy Core:**
- Without this, Veiled is just obscure wallet address (no real privacy)
- Cross-site unlinkability = key differentiator from Web2 OAuth
- Prevents ad networks from tracking users across dApps

**Technical Soundness:**
- Well-established cryptographic pattern
- Same principle as Ethereum's Account Abstraction
- No new crypto invention (lower risk)

**Demo Impact:**
- Easy to demonstrate: Same user, two domains, different nullifiers
- Visually clear privacy benefit
- Judges understand immediately

### Success Criteria

✅ Same wallet on app1.com = nullifier_A
✅ Same wallet on app2.com = nullifier_B
✅ nullifier_A ≠ nullifier_B (proven in tests)
✅ Nullifier stored on-chain with domain
✅ Demo shows two domains side-by-side

---

## Core Feature 3: NFT Ownership Proof

### What to Build

**User Story:**
"As an NFT holder, I want to prove I own an NFT from a collection (e.g., Okay Bears) without revealing which specific NFT I own, so that I can access gated content privately."

**Circuit: `nft_ownership.nr`**
```noir
fn main(
    // PRIVATE
    secret_key: Field,
    nft_mint: Field,              // Which NFT I own
    merkle_proof: [Field; 20],    // Proof of NFT in collection
    
    // PUBLIC
    collection_root: pub Field,   // Merkle root of collection
    domain: pub Field,
) -> pub (Field, bool) {
    
    // Verify I own the NFT (derive pubkey from secret)
    let public_key = derive_pubkey(secret_key);
    verify_nft_ownership(public_key, nft_mint);
    
    // Verify NFT is in collection (merkle proof)
    let is_valid = verify_merkle_proof(nft_mint, merkle_proof, collection_root);
    
    // Generate nullifier
    let nullifier = poseidon_hash([secret_key, domain]);
    
    (nullifier, is_valid)
}
```

**SDK Method:**
```typescript
const result = await veiled.signIn({
    requirements: {
        wallet: true,
        nft: {
            collection: new PublicKey("DRiP2Pn2K6fuMLKQmt5rZWe3zwwJBiZgaB7NVrcoVL9R"),
            // Don't need to specify which NFT
        }
    },
    domain: "nft-chat.com"
});

// Result includes proof of ownership
// But NOT which NFT
```

**Data Fetching (Helius):**
```typescript
// SDK fetches user's NFTs via Helius
const helius = new Helius(apiKey);
const userNfts = await helius.rpc.getAssetsByOwner({
    ownerAddress: wallet.publicKey,
});

// Filter for collection
const collectionNfts = userNfts.items.filter(
    nft => nft.grouping.some(g => g.group_value === collection.toString())
);

if (collectionNfts.length === 0) {
    throw new Error("No NFTs from this collection");
}

// Use first NFT for proof (user doesn't choose)
const nftToProve = collectionNfts[0];
```

### Why This Feature

**Helius Bounty:**
- $5k prize requires "best privacy project using Helius"
- Fetching NFTs = primary Helius use case
- Demonstrates enhanced API usage

**Real Use Case:**
- Token gating is HUGE (Discord, Telegram, exclusive chats)
- Current solutions expose which NFT (doxes rarity, value)
- Veiled: Prove membership, hide specifics

**Technical Interest:**
- Merkle proofs = classic ZK technique
- Shows circuit complexity beyond basic proof
- Judges appreciate cryptographic rigor

### Success Criteria

✅ Fetch NFTs via Helius API
✅ Generate merkle tree of collection
✅ Create proof for owned NFT
✅ Verify on-chain (NFT ownership confirmed)
✅ Demo shows: "Has Okay Bear" but not "Okay Bear #1234"

---

## Core Feature 4: Balance Range Proof

### What to Build

**User Story:**
"As a DeFi user, I want to prove I have sufficient balance (e.g., >10k USDC) without revealing my exact balance, so that I can qualify for services without doxing my net worth."

**Circuit: `balance_range.nr`**
```noir
fn main(
    // PRIVATE
    secret_key: Field,
    actual_balance: Field,        // e.g., 15000 USDC
    
    // PUBLIC
    minimum_required: pub Field,  // e.g., 10000 USDC
    domain: pub Field,
) -> pub (Field, bool) {
    
    // Verify I control wallet with this balance
    let public_key = derive_pubkey(secret_key);
    
    // Range proof: actual >= minimum
    let sufficient = actual_balance >= minimum_required;
    
    // Generate nullifier
    let nullifier = poseidon_hash([secret_key, domain]);
    
    (nullifier, sufficient)
}
```

**SDK Method:**
```typescript
const result = await veiled.signIn({
    requirements: {
        wallet: true,
        balance: {
            minimum: 10_000,              // 10k USDC
            token: USDC_MINT,             // Specific token
        }
    },
    domain: "defi-app.com"
});

// Proof shows: balance >= 10k
// Does NOT show: exact balance (could be 10k or 10M)
```

**Balance Fetching:**
```typescript
// Via Helius or Quicknode
async function getBalance(
    wallet: PublicKey,
    token?: PublicKey
): Promise<number> {
    if (!token) {
        // SOL balance
        return connection.getBalance(wallet);
    } else {
        // SPL token balance
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            wallet,
            { mint: token }
        );
        return tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount || 0;
    }
}
```

### Why This Feature

**Range Compliance Bounty:**
- $1.5k prize for "compliant privacy"
- Selective disclosure = exactly what Range wants
- Easy integration with their SDK

**Real Use Case:**
- Credit checks without revealing income
- Accredited investor verification
- Tiered membership (Silver/Gold/Platinum) without exposing wealth
- DeFi whitelisting

**Responsible Privacy:**
- NOT hiding criminal funds
- Still provable (balance is real)
- Auditors can verify if needed (with user permission)

### Success Criteria

✅ Prove balance >= threshold
✅ Proof does NOT reveal exact balance
✅ Works for SOL and SPL tokens
✅ Integration with Range SDK (if time)
✅ Demo shows: "Qualified" without "You have $X"

---

## Core Feature 5: SDK with OAuth-like API

### What to Build

**User Story:**
"As a dApp developer, I want to integrate private authentication as easily as OAuth, so that I don't need to learn complex ZK cryptography."

**API Design (Familiar Pattern):**
```typescript
// Compare to OAuth 2.0
// OAuth:    const token = await oauth.getToken({ scope: "email" })
// Veiled:   const result = await veiled.signIn({ requirements: {...} })

// Standard initialization
const veiled = new VeiledAuth({
    rpcProvider: 'helius',
    rpcApiKey: process.env.HELIUS_KEY,
    programId: VEILED_PROGRAM_ID,
});

// Standard sign in
const result = await veiled.signIn({
    requirements: { wallet: true },
    domain: window.location.hostname,
});

// Standard session check
const isValid = await veiled.verifySession(result.nullifier);

// Standard sign out
await veiled.signOut();
```

**Error Handling:**
```typescript
try {
    const result = await veiled.signIn({...});
} catch (error) {
    if (error instanceof WalletNotConnectedError) {
        // Prompt user to connect wallet
    } else if (error instanceof ProofGenerationError) {
        // Show error: "Could not generate proof"
    } else if (error instanceof InsufficientBalanceError) {
        // Show error: "Balance too low"
    }
}
```

**Framework Integration:**
```typescript
// Framework-agnostic usage (React/Svelte/Vue wrappers can be added later if desired)
import { VeiledAuth } from '@veiled/core';

const veiled = new VeiledAuth({ rpcProvider: 'helius' });
await veiled.signIn({ requirements: { wallet: true }, domain: window.location.hostname });
```

### Why This Feature

**Track 02 Requirement:**
- "Make it easier for developers to build with privacy"
- OAuth-like API = MUCH easier than raw ZK
- 3-line integration vs 300-line circuit

**Adoption Barrier:**
- Developers won't use complex APIs
- Must be as easy as existing auth (Firebase, Auth0)
- Good DX = actual usage

**Demo Impact:**
- Show code side-by-side: Veiled vs normal auth
- Judges see simplicity
- "I could use this tomorrow" reaction

### Success Criteria

✅ Install: `bun add @veiled/core` (or `npm install @veiled/core`)
✅ Init: 1 line
✅ Sign in: 1 method call
✅ Verify: 1 method call
✅ Demo shows code snippets
✅ Documentation with examples

---

## Core Feature 6: Comparison Demo

### What to Build

**User Story:**
"As a potential user, I want to see side-by-side what information normal auth exposes vs what Veiled exposes, so that I understand the privacy benefit."

**Split-Screen UI:**
```
┌─────────────────────────┬─────────────────────────┐
│  Normal "Sign In"       │  "Sign In with Veiled"  │
├─────────────────────────┼─────────────────────────┤
│  Connected:             │  Connected:             │
│  9xQu...7tKc (full)     │  [Wallet Hidden]        │
│                         │                         │
│  Balance:               │  Verified:              │
│  ◎ 125.43 SOL          │  ✓ Sufficient Balance   │
│  $15,234 USDC          │  (no amount shown)      │
│                         │                         │
│  NFTs Owned:           │  Verified:              │
│  • Okay Bear #4521     │  ✓ Has Okay Bear        │
│  • SMB #1337           │  (no number shown)      │
│  • DeGod #891          │                         │
│                         │                         │
│  Transaction History:  │  Transaction History:   │
│  ✓ Visible on-chain    │  ✗ Not visible to dApp  │
│                         │                         │
│  Cross-Site Tracking:  │  Cross-Site Tracking:   │
│  ✗ Same ID everywhere  │  ✓ Unique per site      │
└─────────────────────────┴─────────────────────────┘
```

**Implementation:**
```typescript
// Two authentication flows side-by-side
async function normalAuth() {
    const wallet = await connectWallet();
    
    // Expose everything
    return {
        address: wallet.publicKey.toString(),
        balance: await getBalance(wallet.publicKey),
        nfts: await getNFTs(wallet.publicKey),
        history: `solscan.io/account/${wallet.publicKey}`,
    };
}

async function veiledAuth() {
    const result = await veiled.signIn({...});
    
    // Expose only proofs
    return {
        nullifier: result.nullifier,
        hasNFT: true,
        hasBalance: true,
        // No address, no specifics
    };
}
```

### Why This Feature

**Presentation Impact:**
- Shows problem AND solution in one screen
- Judges instantly understand value
- Visual > textual explanation

**User Education:**
- Most users don't know they're leaking data
- Side-by-side makes it obvious
- Drives adoption post-hackathon

**Demo Video:**
- Perfect for 2-minute demo video
- Can zoom in on each side
- Clear "before and after"

### Success Criteria

✅ Split-screen UI working
✅ Both flows functional
✅ Clear visual contrast
✅ Can switch between modes
✅ Included in demo video

---

## Core Feature 7: Multi-RPC Support

### What to Build

**User Story:**
"As a dApp developer, I want to choose my RPC provider (Helius, Quicknode, custom), so that I can optimize for performance and cost."

**Configuration:**
```typescript
// Helius (for Helius bounty)
const veiled = new VeiledAuth({
    rpcProvider: 'helius',
    rpcApiKey: process.env.HELIUS_KEY,
});

// Quicknode (for Quicknode bounty)
const veiled = new VeiledAuth({
    rpcProvider: 'quicknode',
    rpcUrl: process.env.QUICKNODE_URL,
});

// Custom
const veiled = new VeiledAuth({
    rpcProvider: 'custom',
    rpcUrl: 'https://my-rpc.com',
});
```

**Abstraction Layer:**
```typescript
interface RPCProvider {
    getBalance(wallet: PublicKey): Promise<number>;
    getNFTs(wallet: PublicKey): Promise<NFT[]>;
    sendTransaction(tx: Transaction): Promise<string>;
}

class HeliusProvider implements RPCProvider {
    // Use Helius-specific APIs
}

class QuicknodeProvider implements RPCProvider {
    // Use Quicknode-specific APIs
}
```

### Why This Feature

**Bounty Requirements:**
- Helius: "Best privacy project using Helius" = must use their RPC
- Quicknode: "Most impactful open-source tooling" = must support them
- Both worth $8k combined

**Developer Flexibility:**
- Different projects have different RPC preferences
- Some already have Helius, some Quicknode
- Custom allows self-hosted nodes

**Low Effort:**
- Abstraction layer = 2 hours work
- Pays for 2 bounties
- High ROI

### Success Criteria

✅ Works with Helius API key
✅ Works with Quicknode URL
✅ Works with custom RPC
✅ Documentation shows all three
✅ README mentions both sponsors

---

## Features NOT to Build (Scope Control)

### ❌ Social Graph Integration

**What:** Prove connections (e.g., "I follow this person") without revealing identity

**Why not:**
- Requires indexing social data
- Out of scope for auth
- Could be follow-up project

### ❌ Reputation System

**What:** Accumulate trust scores across sites

**Why not:**
- Contradicts unlinkability
- Requires persistent identity
- Different use case

### ❌ Token-Gated Actions

**What:** Prove NFT ownership to perform actions (not just auth)

**Why not:**
- Auth = login only
- Actions = separate concern
- Would need transaction signing integration

### ❌ Multi-Wallet Aggregation

**What:** Prove holdings across multiple wallets without revealing any

**Why not:**
- Complex circuit (multiple inputs)
- Edge case (most users 1 wallet)
- Time sink

### ❌ Mobile Apps (Capacitor/Tauri)

**What:** Native iOS/Android apps

**Why not:**
- Web demo sufficient for hackathon
- Wallet adapter support unclear on mobile
- Can be post-hackathon feature

### ❌ Backend Session Management

**What:** Server-side session storage, Redis, etc.

**Why not:**
- On-chain is session storage
- Blockchain = distributed database
- No central server needed

---

## Feature Dependencies

```
FOUNDATION (Must build first)
├─ Wallet ownership circuit
└─ Domain-scoped nullifiers

TIER 1 (Depends on foundation)
├─ On-chain verification
├─ Nullifier registry
└─ Basic SDK

TIER 2 (Depends on Tier 1)
├─ NFT ownership circuit
├─ Balance range circuit
└─ RPC abstraction

TIER 3 (Depends on Tier 2)
├─ Framework integrations
├─ Demo application
└─ Comparison mode
```

---

## Feature Completeness Checklist

**Week 1:**
- [ ] Wallet ownership circuit working
- [ ] Domain scoping implemented
- [ ] Circuit tests passing

**Week 2:**
- [ ] On-chain verification working
- [ ] Nullifier registry storing data
- [ ] Transaction costs reasonable

**Week 3:**
- [ ] NFT ownership circuit working
- [ ] Balance range circuit working
- [ ] SDK with simple API
- [ ] Demo app showing basic flow

**Week 4:**
- [ ] Framework integrations (React, Svelte)
- [ ] Comparison mode in demo
- [ ] Multi-RPC support
- [ ] Documentation complete
- [ ] Demo video recorded

**Post-Hackathon (if win):**
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Community adoption
- [ ] Additional features (social graph, reputation, etc.)

---

## Next Document

Read `04_BUILD_ROADMAP.md` for week-by-week task breakdown.
