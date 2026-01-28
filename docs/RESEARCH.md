# Veiled Research & Learning Guide

**Comprehensive research areas and resources for building Veiled**

This document outlines everything you need to learn and research to build Veiled successfully.

---

## Table of Contents

1. [Noir & Zero-Knowledge Proofs](#noir--zero-knowledge-proofs)
2. [Anchor & Solana Programming](#anchor--solana-programming)
3. [Groth16 Proof System](#groth16-proof-system)
4. [RPC Integration](#rpc-integration)
5. [Frontend Integration](#frontend-integration)
6. [Cryptographic Primitives](#cryptographic-primitives)
7. [Similar Projects Study](#similar-projects-study)
8. [Bounty Requirements](#bounty-requirements)

---

## Noir & Zero-Knowledge Proofs

### Priority: 🔴 CRITICAL - Start immediately

### What You Need to Learn

1. **Noir Language Basics**
   - Writing circuits in Noir
   - Noir syntax and data types
   - Constraint systems
   - Public vs private inputs

2. **Proof Generation**
   - Compiling circuits to WASM
   - Generating proofs in browser
   - Proof size optimization
   - Witness generation

3. **Verification**
   - Verification keys
   - On-chain verification
   - Proof validation

### Learning Resources

#### Official Documentation
- **Noir Docs**: https://noir-lang.org/docs
  - Start here: "Getting Started" → "Hello World"
  - Read: "Language" section completely
  - Study: "Standard Library" for available functions

- **Noir Examples**: https://github.com/noir-lang/noir-examples
  - Study: `private_voting` - similar to our use case
  - Study: `merkle_proof` - useful for NFT ownership
  - Clone and run all examples

#### Key Tutorials
1. **"Building Your First Noir Circuit"**
   - https://noir-lang.org/docs/tutorials/noirjs_app
   - Build the tutorial app start to finish
   - Adapt it for Solana (not Ethereum)

2. **"Noir for Solana Developers"**
   - Search: "Noir Solana integration"
   - Read: Aztec docs on Solana

3. **"Zero-Knowledge Proofs Explained"**
   - https://zkintro.com/articles/programming-zkps-from-zero-to-hero
   - Watch: "ZK Whiteboard Sessions" on YouTube
   - Understand: What ZK proves, soundness, completeness

#### Hands-On Learning Plan

**Day 1: Setup & Hello World**
```bash
# Install Noir
curl -L https://install.noir-lang.org | bash
noirup

# Create first project
nargo new hello_world
cd hello_world

# Study the generated structure
cat src/main.nr
```

**Day 2: Build Simple Proof**
```noir
// src/main.nr - Learn by doing
fn main(x: Field, y: pub Field) {
    assert(x + 2 == y); // Prove x + 2 = y without revealing x
}
```

```bash
# Generate proof
nargo prove

# Verify proof
nargo verify

# Study the generated files
ls proofs/
```

**Day 3: Hash Functions (Critical for Veiled)**
```noir
// Learn Poseidon hash (used for nullifiers)
use dep::std;

fn main(input: Field) -> pub Field {
    std::hash::poseidon::bn254::hash_1([input])
}
```

**Day 4: Public Key Cryptography**
```noir
// Learn Ed25519 (Solana's signature scheme)
use dep::std;

fn main(secret_key: [u8; 32]) -> pub [u8; 32] {
    std::ec::derive_public_key(secret_key)
}
```

### Research Questions to Answer

- [ ] How do I pass Solana wallet keys to Noir circuit?
- [ ] What hash function should I use for nullifiers? (Answer: Poseidon)
- [ ] How to compile Noir to optimized WASM?
- [ ] What's the maximum proof generation time acceptable? (Target: <5s)
- [ ] How to cache circuits in browser?
- [ ] Can I use Web Workers for proof generation?

### Common Pitfalls

⚠️ **Constraint overflow**: Noir circuits have limits
- Solution: Keep circuits simple, under 1000 constraints

⚠️ **Slow proof generation**: Large circuits = slow proofs
- Solution: Minimize operations, use efficient hash functions

⚠️ **Type mismatches**: Noir is strongly typed
- Solution: Use `Field` for most numeric operations

---

## Anchor & Solana Programming

### Priority: 🔴 CRITICAL - Start Day 3

### What You Need to Learn

1. **Anchor Framework**
   - Program structure (lib.rs)
   - Accounts and PDAs
   - Instructions and context
   - Error handling
   - Testing

2. **Solana Concepts**
   - Accounts model
   - Transactions and instructions
   - Rent and account size
   - Program Derived Addresses (PDAs)
   - Cross-Program Invocation (CPI)

3. **Veiled-Specific**
   - How to verify Groth16 proofs on-chain
   - Nullifier storage patterns
   - Compute unit optimization

### Learning Resources

#### Official Documentation
- **Anchor Book**: https://book.anchor-lang.com/
  - Read chapters 1-5 completely
  - Focus on: PDAs, Account validation

- **Solana Cookbook**: https://solanacookbook.com/
  - Study: "Core Concepts" → "Accounts"
  - Study: "Core Concepts" → "PDAs"

- **Solana Docs**: https://docs.solana.com/
  - Read: "Developing" → "Programming Model"

#### Key Tutorials

1. **"Anchor in 20 Minutes"**
   - https://www.anchor-lang.com/docs/installation
   - Build the counter program
   - Deploy to devnet
   - Test with Anchor tests

2. **"Solana Program Examples"**
   - https://github.com/solana-developers/program-examples
   - Study: `basics/counter`
   - Study: `basics/pda-rent-payer`
   - Adapt patterns for Veiled

3. **"PDA Deep Dive"**
   - https://solanacookbook.com/core-concepts/pdas.html
   - Understand seeds and bumps
   - Practice deriving PDAs

#### Hands-On Learning Plan

**Day 3: Anchor Setup & Hello World**
```bash
# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Create project
anchor init veiled_test
cd veiled_test

# Study generated files
cat programs/veiled_test/src/lib.rs
```

**Day 4: Build Simple State Program**
```rust
// Programs that stores a number and increments it
// Learn: Account structure, PDAs, mutations

#[program]
pub mod counter {
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        Ok(())
    }
}

#[account]
pub struct Counter {
    pub count: u64,
}
```

**Day 5: Learn PDAs (Critical for Nullifiers)**
```rust
// Understand how to create deterministic accounts
#[derive(Accounts)]
pub struct CreateNullifier<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 1,
        seeds = [b"nullifier", nullifier_id.as_ref()],
        bump
    )]
    pub nullifier: Account<'info, NullifierAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// This creates deterministic address for each nullifier
// Same nullifier = same address (idempotent)
```

**Day 6: Test on Devnet**
```bash
# Get devnet SOL
solana airdrop 2 --url devnet

# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests
anchor test
```

### Research Questions to Answer

- [ ] How to store verification keys on-chain?
- [ ] What's the compute unit cost of Groth16 verification?
- [ ] How to optimize account rent?
- [ ] How to handle concurrent nullifier creation?
- [ ] What's the best PDA derivation pattern?
- [ ] How to emit events for indexing?

### Solana-Specific Patterns to Study

**1. Account Rent**
```rust
// Learn: Rent exemption calculation
let space = 8 + NullifierAccount::LEN;
let rent = Rent::get()?;
let lamports = rent.minimum_balance(space);
```

**2. PDA Derivation**
```rust
// Deterministic addresses
let (pda, bump) = Pubkey::find_program_address(
    &[b"nullifier", nullifier.as_ref()],
    program_id
);
```

**3. Idempotent Operations**
```rust
// init_if_needed pattern (important!)
#[account(
    init_if_needed,
    payer = payer,
    space = 8 + NullifierAccount::LEN,
    seeds = [b"nullifier", nullifier.as_ref()],
    bump
)]
```

---

## Groth16 Proof System

### Priority: 🟡 HIGH - Week 2

### What You Need to Learn

1. **Groth16 Basics**
   - What is Groth16
   - Proof structure
   - Verification algorithm
   - Verification keys

2. **On-Chain Verification**
   - Solana implementations
   - Compute unit costs
   - Optimization techniques

### Learning Resources

#### Papers & Theory
- **Groth16 Paper**: https://eprint.iacr.org/2016/260.pdf
  - Don't read the whole thing (too dense)
  - Read: Abstract, Introduction, Section 3 (construction)
  - Skim: Proofs for intuition

- **"Understanding PLONK"** (for context)
  - https://vitalik.ca/general/2019/09/22/plonk.html
  - Understand why Groth16 (smaller proofs, faster verification)

#### Implementations to Study

**1. Solana Groth16 Verifier**
- Search GitHub: "solana groth16 verifier"
- Study: https://github.com/anoma/solana-ibc/tree/main/programs/solana-ibc/src/groth16_verifier
- Copy pattern for Veiled

**2. Noir Verifier Generation**
```bash
# Noir generates verification keys automatically
nargo compile

# Study the output
cat target/verification_key.json
```

### Research Questions

- [ ] Can I use existing Solana Groth16 verifier?
- [ ] What's the compute unit cost? (Target: <50k CU)
- [ ] Should verification key be stored on-chain or passed as instruction data?
- [ ] How to deserialize proofs from bytes?

### Implementation Approach

**Week 1:** Skip real verification (accept all proofs)
```rust
// Temporary MVP
pub fn verify_auth(ctx: Context<VerifyAuth>, proof: Vec<u8>) -> Result<()> {
    // TODO: Real verification in Week 2
    // For now, just accept the proof
    msg!("Warning: Not verifying proof yet");
    Ok(())
}
```

**Week 2:** Add real verification
```rust
pub fn verify_auth(ctx: Context<VerifyAuth>, proof: Vec<u8>) -> Result<()> {
    // Deserialize proof
    let groth16_proof = Groth16Proof::from_bytes(&proof)?;
    
    // Load verification key
    let vk = &ctx.accounts.verification_key;
    
    // Verify!
    require!(
        groth16::verify(&vk.key, &groth16_proof, &public_inputs)?,
        ErrorCode::InvalidProof
    );
    
    Ok(())
}
```

---

## RPC Integration

### Priority: 🟡 HIGH - Week 2

### What You Need to Learn

1. **Helius APIs**
   - Enhanced RPC methods
   - NFT APIs
   - WebSocket subscriptions
   - Rate limits

2. **Quicknode APIs**
   - Standard RPC
   - Add-ons available
   - Multi-chain support

### Learning Resources

#### Helius Documentation
- **Main Docs**: https://docs.helius.dev/
  - Read: "Introduction"
  - Study: "Enhanced APIs" section
  - Focus on: `getAssetsByOwner` (for NFTs)

- **SDK Guide**: https://github.com/helius-labs/helius-sdk
  - Install: `npm install @helius-labs/sdk`
  - Study examples in repo

#### Quicknode Documentation
- **Solana RPC**: https://www.quicknode.com/docs/solana
  - Standard JSON-RPC methods
  - Understand rate limits

### Hands-On Learning

**Helius Integration Example:**
```typescript
import { Helius } from '@helius-labs/sdk';

const helius = new Helius(process.env.HELIUS_API_KEY);

// Fetch NFTs (enhanced API)
const nfts = await helius.rpc.getAssetsByOwner({
  ownerAddress: wallet.publicKey.toBase58(),
  page: 1,
  limit: 1000,
});

console.log(`Found ${nfts.total} NFTs`);

// WebSocket for real-time updates
helius.connection.onAccountChange(
  new PublicKey(VEILED_PROGRAM_ID),
  (accountInfo) => {
    console.log('New auth event!', accountInfo);
  }
);
```

**Quicknode Integration Example:**
```typescript
import { Connection } from '@solana/web3.js';

const connection = new Connection(
  process.env.QUICKNODE_RPC_URL,
  'confirmed'
);

// Standard RPC methods
const balance = await connection.getBalance(wallet.publicKey);
const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
  wallet.publicKey,
  { programId: TOKEN_PROGRAM_ID }
);
```

### Research Questions

- [ ] What's Helius rate limit on devnet? Mainnet?
- [ ] Which Helius APIs are most useful for Veiled?
- [ ] Does Quicknode have NFT APIs?
- [ ] Should I support fallback between providers?

### Bounty Requirements

**Helius ($5k):**
- ✅ Use Helius RPC
- ✅ Use enhanced APIs (not just standard RPC)
- ✅ Showcase in demo
- ✅ Document integration

**Quicknode ($3k):**
- ✅ Open source (MIT)
- ✅ Support Quicknode RPC
- ✅ Document how to switch providers
- ✅ Make it easy for others to use

---

## Frontend Integration

### Priority: 🟢 MEDIUM - Week 3

### What You Need to Learn

1. **SvelteKit**
   - Routing
   - Server-side rendering
   - API routes
   - Deployment

2. **Wallet Integration**
   - Solana Wallet Adapter
   - Phantom, Backpack, Solflare
   - Sign messages
   - Send transactions

3. **TailwindCSS + shadcn/ui**
   - Component patterns
   - Styling conventions
   - Dark mode

### Learning Resources

#### SvelteKit
- **Official Tutorial**: https://learn.svelte.dev/
  - Complete parts 1-4
  - Focus on: Routing, Loading data

- **SvelteKit Docs**: https://kit.svelte.dev/docs
  - Read: "Introduction" → "Routing"

#### Solana Wallet Adapter
- **Adapter Docs**: https://github.com/solana-labs/wallet-adapter
  - Read: "Getting Started"
  - Study: SvelteKit example

```bash
# Install wallet adapter
npm install @sveltejs/adapter-auto @solana/wallet-adapter-base \
  @solana/wallet-adapter-svelte @solana/wallet-adapter-ui \
  @solana/wallet-adapter-wallets
```

**Basic Integration:**
```svelte
<script lang="ts">
  import { WalletProvider, WalletMultiButton } from '@solana/wallet-adapter-svelte';
  import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
  
  const wallets = [new PhantomWalletAdapter()];
</script>

<WalletProvider {wallets} autoConnect>
  <WalletMultiButton />
  
  <!-- Your app here -->
</WalletProvider>
```

#### shadcn/ui for Svelte
- **shadcn-svelte**: https://www.shadcn-svelte.com/
  - Install components as needed
  - Copy & paste philosophy

```bash
# Initialize shadcn-svelte
npx shadcn-svelte@latest init

# Add button component
npx shadcn-svelte@latest add button
```

### Research Questions

- [ ] How to sign messages with wallet adapter?
- [ ] How to send Anchor transactions from frontend?
- [ ] How to show loading states during proof generation?
- [ ] How to handle wallet not connected?

---

## Cryptographic Primitives

### Priority: 🟢 MEDIUM - As needed

### What You Need to Know

1. **Hash Functions**
   - Poseidon (circuit-friendly)
   - SHA-256 (Solana native)
   - When to use each

2. **Public Key Crypto**
   - Ed25519 (Solana's signature scheme)
   - Key derivation
   - Signature verification

3. **Nullifiers**
   - What they are
   - Why they're needed
   - How to generate them

### Learning Resources

**Poseidon Hash:**
- Paper: https://eprint.iacr.org/2019/458.pdf
- Skip theory, just know: "Circuit-friendly hash function"
- Use Noir's built-in: `std::hash::poseidon::bn254::hash_1`

**Ed25519:**
- Explainer: https://ed25519.cr.yp.to/
- Solana uses it for signatures
- Noir has: `std::ec::derive_public_key`

**Nullifiers:**
```noir
// A nullifier is: hash(wallet + domain + secret)
// Properties:
// 1. Same wallet + same domain = same nullifier
// 2. Different domain = different nullifier
// 3. Can't reverse to get wallet

fn generate_nullifier(
    wallet: Field,
    domain: Field,
    secret: Field
) -> Field {
    poseidon::hash_3([wallet, domain, secret])
}
```

---

## Similar Projects Study

### Priority: 🟢 MEDIUM - For ideas

### Projects to Analyze

**1. Semaphore Protocol (Ethereum)**
- GitHub: https://github.com/semaphore-protocol/semaphore
- What to learn: Nullifier patterns, group membership proofs
- How it differs: Ethereum-focused, we're Solana-native

**2. Elusiv (Solana Privacy)**
- Docs: https://docs.elusiv.io/
- What to learn: Solana privacy patterns
- How it differs: They do private payments, we do authentication

**3. Sign in with Ethereum (SIWE)**
- Spec: https://eips.ethereum.org/EIPS/eip-4361
- What to learn: Message format, session management
- How it differs: Not private, we add ZK layer

### Study These Repos

```bash
# Clone and study
git clone https://github.com/semaphore-protocol/semaphore
git clone https://github.com/elusiv-privacy/elusiv

# Read their:
# - Circuit implementations
# - Smart contract patterns
# - SDK architecture
```

---

## Bounty Requirements Research

### Priority: 🔴 CRITICAL - Day 1

### Track 02: Privacy Tooling

**Requirements:**
- ✅ Infrastructure OR libraries OR frameworks
- ✅ Makes privacy easier for developers
- ✅ Production-ready (or close to it)
- ✅ Open source

**How Veiled Qualifies:**
- Infrastructure: Anchor program
- Libraries: @veiled/core (framework-agnostic JS/TS SDK)
- Framework: OAuth-like authentication framework
- Developer-focused: 3-line integration

**Submission Checklist:**
- [ ] README explains developer benefits
- [ ] API documentation clear
- [ ] Integration examples provided
- [ ] Demo shows "easy to use"

### Helius Bounty ($5k)

**Requirements:**
- ✅ Use Helius RPC/APIs
- ✅ Build privacy-related project
- ✅ Showcase integration

**Implementation:**
```typescript
// Must demonstrate in code and docs
import { Helius } from '@helius-labs/sdk';

const helius = new Helius(HELIUS_KEY);

// Use enhanced APIs
const nfts = await helius.rpc.getAssetsByOwner({...});
```

**Submission Checklist:**
- [ ] Helius SDK used prominently
- [ ] Enhanced APIs showcased (not just standard RPC)
- [ ] README mentions Helius integration
- [ ] Demo video shows Helius features

### Quicknode Bounty ($3k)

**Requirements:**
- ✅ Open source privacy tooling
- ✅ Clear documentation
- ✅ Public benefit

**Submission Checklist:**
- [ ] MIT license
- [ ] Supports Quicknode RPC
- [ ] README has "Supported RPCs" section
- [ ] Easy to configure provider

### Aztec/Noir Bounty ($10k pool)

**Requirements:**
- ✅ Use Noir for ZK circuits
- ✅ Creative application
- ✅ Well-documented circuits

**Target: "Best Non-Financial Use Case" ($2.5k)**
- Authentication is non-financial
- Novel application of ZK
- Production-ready

**Submission Checklist:**
- [ ] Circuits in Noir (not circom)
- [ ] README explains circuit design
- [ ] Comments in circuit code
- [ ] Why Noir (not circom) documented

### Range Bounty ($1.5k)

**Requirements:**
- ✅ Use selective disclosure
- ✅ Compliance-aware
- ✅ Integrate Range SDK

**Implementation:**
```typescript
// Add Range pre-screening
import { Range } from '@range-sdk/core';

const proof = await veiled.signIn({
  prove: ['balance > 100 USDC'],
  compliance: Range.getComplianceProof()
});
```

**Submission Checklist:**
- [ ] Range SDK integrated
- [ ] Selective disclosure used
- [ ] Compliance documented
- [ ] Works with Range API

---

## Learning Priority Order

**Week 1 (Immediate):**
1. Noir basics (Day 1-2)
2. Anchor basics (Day 3-4)
3. Simple integration (Day 5-7)

**Week 2 (Once fundamentals work):**
1. Groth16 verification
2. RPC integration
3. Optimization

**Week 3 (Polish):**
1. Frontend patterns
2. Demo building
3. Documentation

**Week 4 (Submission):**
1. Bounty requirements
2. Presentation
3. Testing

---

## Quick Reference Commands

```bash
# Noir
nargo compile                    # Compile circuit
nargo prove                      # Generate proof
nargo verify                     # Verify proof
nargo test                       # Run tests

# Anchor
anchor build                     # Build program
anchor deploy --provider.cluster devnet
anchor test                      # Run tests

# Solana
solana airdrop 2 --url devnet   # Get devnet SOL
solana program deploy            # Deploy program
solana logs                      # View logs

# Development
bun install                      # Install deps
bun run build                    # Build packages
bun test                         # Run tests
```

---

## When You Get Stuck

**Noir questions:**
- Noir Discord: https://discord.gg/aztec
- Noir Docs: https://noir-lang.org/docs
- Search GitHub issues: https://github.com/noir-lang/noir/issues

**Anchor questions:**
- Anchor Discord: https://discord.gg/anchorlang
- Solana StackExchange: https://solana.stackexchange.com/

**Solana questions:**
- Solana Discord: https://discord.gg/solana
- Solana Cookbook: https://solanacookbook.com/

**General:**
- ChatGPT for code examples
- GitHub Copilot for boilerplate
- Search: "solana [your question] site:github.com"

---

## Daily Learning Routine

**Morning (1 hour):**
- Read documentation
- Watch tutorial videos
- Study example code

**Afternoon (3-4 hours):**
- Hands-on coding
- Build examples
- Test implementations

**Evening (1 hour):**
- Review what you built
- Document learnings
- Plan next day

**Remember:** You don't need to be an expert. You need to build something that works well enough to win bounties. Focus on getting it working, then optimize.

---

**Next:** Start with Day 1 of DEVELOPMENT_PLAN.md
