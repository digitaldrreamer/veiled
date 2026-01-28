# Veiled Features & Capabilities

**Complete feature set for Solana Privacy Hackathon 2026**

---

## Core Features

### 1. Multi-Circuit Zero-Knowledge Authentication

**Three Production Circuits:**

#### Circuit 1: Wallet Ownership (Basic)
```
Proves: User owns a Solana wallet
Without revealing: The actual wallet address
Constraints: ~10,600
Generation time: <3 seconds
Use case: Basic authentication
```

#### Circuit 2: Balance Range Proof (Advanced)
```
Proves: Balance meets minimum requirement
Reveals: Balance range bucket (e.g., "100-1000 SOL")
Hides: Exact balance amount
Constraints: ~12,000
Generation time: <4 seconds
Use cases: DeFi gating, VIP access, credit scoring
```

#### Circuit 3: NFT Ownership Proof (Advanced)
```
Proves: Owns NFT from specific collection
Reveals: Collection address only
Hides: Specific token ID, other NFTs owned
Constraints: ~11,000
Generation time: <4 seconds
Use cases: Token-gated communities, exclusive access
```

**Why Multiple Circuits Matter:**
- Demonstrates technical depth
- Shows versatility (not one-trick pony)
- Enables complex use cases
- Judges love seeing advanced crypto

---

## 2. Vanilla JavaScript SDK (Primary)

### Universal Compatibility

**Global Object Pattern:**
```html
<!-- Drop into ANY website -->
<script src="https://cdn.veiled.sh/veiled.js"></script>
<script>
  const veiled = new VeiledAuth({ 
    network: 'mainnet',
    rpcProvider: 'helius'
  });
  
  veiled.signIn({ 
    requirements: { wallet: true },
    domain: window.location.hostname
  })
    .then(user => console.log('Logged in:', user.nullifier));
</script>
```

**NPM Module:**
```javascript
import { VeiledAuth } from '@veiled/core';
// Works with React, Vue, Angular, Svelte, vanilla JS
```

**Framework Wrappers (Thin):**
```typescript
// Framework-agnostic (works with React/Svelte/Vue/vanilla)
import { VeiledAuth } from '@veiled/core';
```

### Built-in UI Components

**Modal Authentication:**
```javascript
veiled.signIn({
  requirements: {
    wallet: true,
    nft: { collection: DEGODS_COLLECTION }
  },
  domain: window.location.hostname,
  ui: {
    mode: 'modal',        // or 'popup' or 'redirect' or 'headless'
    theme: 'dark',
    logo: '/logo.png',
    title: 'Sign in to access exclusive content'
  }
});
```

**Progress Tracking:**
```javascript
veiled.on('proof:generating', ({ progress }) => {
  updateProgressBar(progress); // 0-100%
});
```

**Event System:**
```javascript
// Complete lifecycle events
veiled.on('auth:started', () => {});
veiled.on('wallet:connecting', () => {});
veiled.on('wallet:connected', (pubkey) => {});
veiled.on('proof:generating', ({ progress }) => {});
veiled.on('proof:complete', () => {});
veiled.on('verification:submitting', () => {});
veiled.on('verification:complete', (signature) => {});
veiled.on('auth:success', (session) => {});
veiled.on('auth:failed', (error) => {});
veiled.on('session:expired', () => {});
```

---

## 3. On-Chain App Registration

### Developer Self-Service

**Register Apps On-Chain:**
```bash
# CLI tool
veiled-cli register myapp.com \
  --name "My Cool App" \
  --logo "https://myapp.com/logo.png" \
  --category defi \
  --description "A private DeFi platform"

# Cost: ~0.01 SOL (paid by developer)
# Result: PDA address + on-chain record
```

**What Gets Stored:**
```rust
pub struct AppAccount {
    pub domain: String,           // myapp.com
    pub name: String,             // My Cool App
    pub description: String,
    pub logo_url: String,
    pub contact: String,
    pub category: AppCategory,    // DeFi, NFT, Gaming, etc.
    pub authority: Pubkey,        // Owner
    pub created_at: i64,
    pub total_auths: u64,         // Auto-incremented
    pub is_active: bool,
    pub verified: bool,           // Manual verification
    pub dns_verified: bool,       // DNS proof provided
}
```

**Benefits for Developers:**
- Listed in app directory
- Analytics dashboard access
- Usage statistics
- Verified badges
- Trust signals for users

**Benefits for Ecosystem:**
- Discover apps built with Veiled
- See real usage stats
- Trust indicators
- Public verification
- No gatekeeping (permissionless)

---

## 4. Three-Tier Verification System

### Tier 1: Unverified (Default)
```
Status: ⚠️ Unverified app
Badge: None (warning indicator)
Requirements: None
Cost: Free
User sees: "Unverified app - proceed with caution"
```

**Characteristics:**
- Works immediately, no registration
- Auto-detected from window.location.hostname
- Lower trust but zero friction
- Good for development/testing

### Tier 2: DNS Verified
```
Status: ✅ Domain Verified
Badge: Green checkmark
Requirements: DNS TXT record
Cost: Free
User sees: "Domain verified - owner confirmed"
```

**Process:**
```bash
# 1. Generate challenge
veiled-cli verify-start myapp.com
# Output: Add TXT record to _veiled-challenge.myapp.com

# 2. Add DNS record (via Cloudflare, Route53, etc.)
_veiled-challenge.myapp.com TXT "veiled-verification=abc123..."

# 3. Verify
veiled-cli verify-check myapp.com
# Output: ✅ Verified! Proof saved.

# 4. Register with proof
veiled-cli register myapp.com --dns-proof .veiled-proof-myapp.json
```

**Characteristics:**
- Proves domain ownership
- Decentralized verification (DNS-based)
- No centralized authority
- Like Let's Encrypt for identity

### Tier 3: On-Chain Registered
```
Status: ✅ Verified on Solana
Badge: Blue checkmark
Requirements: On-chain registration (~0.01 SOL)
Cost: ~0.01 SOL one-time
User sees: "Verified on Solana - 1.2K users trust this app"
```

**Benefits:**
- Immutable record
- Public verification
- Analytics access
- App directory listing
- Usage statistics shown

### Tier 4: Manually Verified (Future)
```
Status: ✅ Verified by Veiled
Badge: Gold checkmark
Requirements: Human review + good standing
Cost: Free (by application)
User sees: "Verified by Veiled - Featured app"
```

**Benefits:**
- Highest trust
- Featured placement
- "Editor's Choice"
- Marketing support

---

## 5. Comprehensive Testing

### Test Coverage Goals: >80%

**Circuit Tests (Noir):**
- 15+ tests per circuit (45+ total)
- Valid proof generation
- Invalid input handling
- Edge cases (expired timestamps, wrong hashes)
- Cross-domain nullifier uniqueness
- Constraint optimization verification

**Anchor Program Tests (TypeScript):**
- 20+ integration tests
- App registration (valid, duplicate, invalid)
- Authentication flow (proof verification, nullifier tracking)
- App queries (list, fetch, filter)
- Permission checks
- Error handling

**SDK Tests (Bun):**
- 30+ unit tests
- Initialization
- Event system
- Session management
- App registration API
- Error recovery
- Mock wallet integration

**Integration Tests (E2E):**
- 10+ full-flow tests
- Complete auth flow (wallet → proof → verify → session)
- Multi-circuit support
- RPC failover
- Modal UI interactions

**Performance Tests:**
- 5+ benchmark tests
- Proof generation time (<5s requirement)
- Modal render time (<100ms)
- Session check speed (<1ms)
- Bundle size (<200KB)

**Test Automation:**
```yaml
# .github/workflows/ci.yml
- name: Test circuits
  run: cd packages/circuit && nargo test

- name: Test Anchor program
  run: cd packages/anchor && anchor test

- name: Test SDK
  run: cd packages/sdk && bun test

- name: Check coverage
  run: bun run coverage
  # Fails if <80%
```

---

## 6. App Directory & Analytics

### Public App Directory

**Features:**
- Browse all registered apps
- Filter by category (DeFi, NFT, Gaming, Social, DAO, Tooling)
- Search by name/domain
- Sort by popularity (total auths)
- View verified badges at a glance

**App Detail Pages:**
- Full description
- Logo and branding
- Usage statistics (total authentications)
- Registration date
- Verification status
- Integration examples
- Contact information

**URL Structure:**
```
/apps                    → All apps
/apps/defi              → DeFi apps only
/apps/verified          → Verified apps only
/apps/[id]              → App detail page
```

### Developer Dashboard

**Analytics:**
- Total authentications
- Daily/weekly/monthly graphs
- Peak usage times
- User retention
- Geographic distribution (optional)

**Management:**
- Update app info
- View integration status
- Download usage reports
- Manage API keys

**Monetization Ready (Post-Hackathon):**
- Premium analytics
- Priority support
- Featured placement
- Custom branding

---

## 7. OAuth2-Inspired API

### Familiar Patterns for Developers

**Standard OAuth2 Flow:**
```typescript
// Looks like OAuth2, but uses ZK proofs internally
const token = await veiled.authorize({
  scope: 'owns_wallet owns_nft:degods',
  response_type: 'token',
  redirect_uri: 'https://myapp.com/callback',
  state: 'abc123'
});

// Returns OAuth2-like token
{
  access_token: "eyJ...",    // JWT with nullifier
  token_type: "Bearer",
  expires_in: 3600,
  scope: "owns_wallet owns_nft:degods",
  nullifier: "0x7a3b..."     // ZK-specific
}
```

**Drop-in Replacement:**
```typescript
// Replace Google OAuth
- const user = await signInWithGoogle();
+ const user = await veiled.authorize({ scope: 'owns_wallet' });

// Same Bearer token pattern
fetch('/api/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Why OAuth2-Inspired:**
- Familiar to developers
- Standard patterns
- Easy migration from Web2
- But with Web3 privacy benefits

---

## 8. RPC Integration (Bounty Targets)

### Helius Integration ($5k Bounty)

**Enhanced APIs:**
```typescript
import { Helius } from '@helius-labs/sdk';

// Fetch NFTs for proof generation
const nfts = await helius.rpc.getAssetsByOwner({
  ownerAddress: wallet.publicKey,
  page: 1,
  limit: 1000
});

// Generate merkle tree for NFT proof
const tree = createMerkleTree(nfts);

// WebSocket for real-time events
helius.connection.onProgramAccountChange(
  VEILED_PROGRAM_ID,
  (accountInfo) => {
    console.log('New auth event:', accountInfo);
  }
);
```

### Quicknode Integration ($3k Bounty)

**Multi-RPC Support:**
```typescript
const veiled = new VeiledAuth({
  network: 'mainnet',
  rpcProvider: 'quicknode',  // or 'helius'
  rpcUrl: process.env.QUICKNODE_RPC_URL
});

// Automatic failover
if (helius.down) {
  fallbackTo(quicknode);
}
```

---

## 9. Selective Disclosure

### Privacy-Preserving Credentials

**Balance Ranges:**
```typescript
// Prove: balance > 100 USDC
// Reveal: "100-1000 USDC" range
// Hide: Exact amount (e.g., 573 USDC)

const result = await veiled.signIn({
  requirements: {
    wallet: true,
    balance: { minimum: 100, token: USDC_MINT }
  },
  domain: window.location.hostname
});

// Note: Balance range disclosure is post-MVP feature
// For MVP, proof verifies minimum balance without revealing exact amount
```

**NFT Count (Not Specific Tokens):**
```typescript
// Prove: owns 3+ NFTs from collection
// Reveal: Count only
// Hide: Specific token IDs

const result = await veiled.signIn({
  requirements: {
    wallet: true,
    nft: { collection: DEGODS_COLLECTION }
  },
  domain: window.location.hostname
});

// Note: NFT count disclosure is post-MVP feature
// For MVP, proof verifies ownership without revealing count
```

**Age Verification:**
```typescript
// Prove: age > 18
// Reveal: Adult status
// Hide: Exact birthdate

// Note: Age verification requires off-chain credentials (post-MVP)
// For MVP, focus on on-chain proofs: wallet ownership, balance, NFT ownership
const result = await veiled.signIn({
  requirements: {
    wallet: true
  },
  domain: window.location.hostname
});
```

---

## 10. Production-Ready Features

### Error Recovery
- Automatic retry with exponential backoff
- Fallback RPC providers
- Graceful degradation (if ZK fails, offer basic wallet connect)
- User-friendly error messages

### Session Management
- JWT-based sessions
- Refresh tokens (extend session without new proof)
- Multi-device support
- Secure storage (httpOnly cookies)
- Session revocation

### Security
- Proof expiry (5-minute timestamp window)
- Nullifier registry (prevent double-use)
- Replay attack prevention
- CSRF protection
- Rate limiting

### Performance
- Circuit caching (25MB WASM, download once)
- Web Worker proof generation (non-blocking UI)
- Optimized bundle size (<200KB minified)
- Lazy loading for framework wrappers
- CDN distribution for WASM circuits

### Developer Experience
- Comprehensive documentation
- Code examples in 5 languages
- CLI tool for common tasks
- TypeScript types included
- Error messages with solutions
- Debug mode

---

## Feature Comparison

| Feature | Traditional OAuth2 | Sign in with Solana | Veiled |
|---------|-------------------|---------------------|--------|
| **Privacy** | ⚠️ Email exposed | ❌ Wallet exposed | ✅ Wallet hidden |
| **Selective disclosure** | ❌ None | ❌ None | ✅ Full support |
| **Decentralized** | ❌ Central server | ✅ Yes | ✅ Yes |
| **Cross-site tracking** | ✅ Easy | ✅ Easy | ❌ Impossible |
| **Verified apps** | ✅ Manual review | ❌ No verification | ✅ 3-tier system |
| **Analytics** | ✅ Provider-controlled | ❌ None | ✅ On-chain, public |
| **Developer setup** | ⚠️ Registration required | ✅ Zero setup | ⚠️ Optional registration |
| **Advanced proofs** | ❌ None | ❌ None | ✅ Balance, NFT, Age |

---

## Bounty Alignment Summary

**Track 02: Privacy Tooling ($15k)**
✅ Infrastructure (Anchor program)
✅ Libraries (SDK, React, Svelte)
✅ Framework (OAuth-like auth)
✅ Developer-focused (3-line integration)

**Helius ($5k)**
✅ Enhanced RPC APIs
✅ NFT metadata fetching
✅ WebSocket subscriptions
✅ Documented prominently

**Quicknode ($3k)**
✅ Open source (MIT)
✅ Multi-RPC support
✅ Public benefit
✅ Easy configuration

**Aztec/Noir ($10k pool)**
✅ Noir circuits (3 advanced circuits)
✅ Non-financial use case (auth)
✅ Well-documented circuits
✅ Creative application

**Range ($1.5k)**
✅ Selective disclosure
✅ Balance range proofs
✅ Compliance-aware design
✅ Integration examples

**Total Potential: $36k**
**Conservative Estimate: $12-15k**

---

## What Makes This Special

### 1. Actually Novel
- First privacy-preserving OAuth for Solana
- All existing solutions expose wallet addresses
- Gap discovered through research, not guessing

### 2. Production-Quality
- Comprehensive testing (>80% coverage)
- Error handling
- Session management
- Performance optimized
- Security audited approach

### 3. Developer-First
- Vanilla JS (works everywhere)
- OAuth2-like API (familiar)
- 3-line integration
- Built-in UI
- Great docs

### 4. Ecosystem Benefit
- App directory (discoverability)
- Verification system (trust)
- Analytics (transparency)
- Open source (forkable)

### 5. Advanced Crypto
- Multiple circuits (not just one)
- Selective disclosure
- Nullifier-based privacy
- Merkle proofs
- Groth16 verification

---

**This isn't just a hackathon project - it's foundational infrastructure the Solana ecosystem needs.**
