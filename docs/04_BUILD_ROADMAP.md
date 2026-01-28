# Build Roadmap - 4-Week Sprint

## Timeline Overview

```
WEEK 1: Foundation (ZK Circuits)
├─ Days 1-2: Noir setup + wallet ownership circuit
├─ Days 3-4: Circuit testing + optimization
├─ Days 5-6: Documentation + verification key export
└─ Day 7:    Buffer / catch up

WEEK 2: On-Chain (Anchor Program)
├─ Days 1-2: Anchor project + authenticate instruction
├─ Days 3-4: Nullifier registry + tests
├─ Days 5-6: Devnet deployment + integration
└─ Day 7:    Buffer / catch up

WEEK 3: Developer Tools (SDK + Demo)
├─ Days 1-2: Core SDK + WASM integration
├─ Days 3-4: Demo app + basic UI
├─ Days 5-6: NFT/balance circuits + integration
└─ Day 7:    Buffer / catch up

WEEK 4: Polish (Bounties + Presentation)
├─ Days 1-2: Framework integrations + multi-RPC
├─ Days 3-4: Comparison mode + UI polish
├─ Days 5-6: Demo video + pitch deck
└─ Day 7:    Final submission
```

---

## Week 1: Foundation - ZK Circuits

### Goals

Build the cryptographic foundation that everything else depends on. By end of Week 1, must be able to generate and verify proofs locally.

### Day 1: Environment Setup

**Morning (4 hours):**
```bash
# Install Noir
curl -L https://install.aztec.network | bash
noir --version

# Create project structure
mkdir veiled
cd veiled
mkdir circuits
mkdir programs
mkdir sdk
mkdir demo

# Initialize Noir project
cd circuits
noir new wallet_ownership
```

**Why Day 1:**
- Noir installation can have issues (M1 Macs, Windows WSL)
- Need time to troubleshoot
- Don't want surprises in Week 2

**Afternoon (4 hours):**
```bash
# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Verify installations
anchor --version
solana --version
noir --version

# Create Anchor project
cd programs
anchor init veiled-program
```

**Deliverables:**
- ✅ Noir working (can compile example)
- ✅ Anchor working (can build example)
- ✅ Project structure created
- ✅ Git repo initialized

### Day 2-3: Wallet Ownership Circuit

**What to Build:**
```
circuits/wallet_ownership/src/main.nr

Core logic:
1. Derive public key from secret key (EdDSA)
2. Generate domain-scoped nullifier
3. Create commitment
4. Return (nullifier, commitment)
```

**Implementation Steps:**

**Step 1: Basic circuit (2 hours):**
```noir
// Start with simplest possible circuit
fn main(
    secret_key: Field,
    domain: pub Field
) -> pub Field {
    let nullifier = std::hash::poseidon::bn254::hash_2([secret_key, domain]);
    nullifier
}
```

**Step 2: Add public key derivation (3 hours):**
```noir
// Add EdDSA pubkey derivation
use dep::std::ec::tecurve::affine::Point;

fn main(
    secret_key: Field,
    domain: pub Field
) -> pub (Field, Field) {
    // Derive public key (EdDSA on Baby Jubjub)
    let public_key = derive_pubkey(secret_key);
    
    // Generate nullifier
    let nullifier = std::hash::poseidon::bn254::hash_2([secret_key, domain]);
    
    // Generate commitment
    let commitment = std::hash::poseidon::bn254::hash_2([public_key.x, public_key.y]);
    
    (nullifier, commitment)
}

fn derive_pubkey(secret: Field) -> Point {
    // Baby Jubjub generator point
    let generator = Point {
        x: ...,  // Standard generator
        y: ...
    };
    
    generator.scalar_mul(secret)
}
```

**Step 3: Test circuit (2 hours):**
```bash
# Compile
cd circuits/wallet_ownership
noir compile

# Generate proof
noir prove

# Verify proof
noir verify
```

**Why 2 days:**
- First circuit is always slow (learning curve)
- EdDSA math can be tricky
- Need time to debug Noir quirks

**Deliverables:**
- ✅ Circuit compiles without errors
- ✅ Can generate proofs locally
- ✅ Proofs verify successfully
- ✅ Tests cover: valid proof ✓, invalid proof ✗

### Day 4: Circuit Optimization

**What to Optimize:**
1. Proof generation speed (<5s target)
2. Proof size (smaller = cheaper on-chain)
3. Circuit constraints (fewer = faster)

**Optimization Tasks:**

**Morning (3 hours):**
```bash
# Benchmark current performance
time noir prove

# Profile constraint count
noir gates

# Identify bottlenecks
# Likely: hash operations, signature verification
```

**Afternoon (4 hours):**
```noir
// Replace expensive operations with cheaper alternatives

// BEFORE: Double hash (expensive)
let nullifier = hash(hash(secret_key, domain));

// AFTER: Single hash (cheaper)
let nullifier = hash_2([secret_key, domain]);

// BEFORE: Full EdDSA verification (many constraints)
verify_eddsa_signature(...);

// AFTER: Just public key derivation (fewer constraints)
derive_pubkey(secret_key);
```

**Why optimize Day 4:**
- Have working circuit first (correctness > speed)
- Know what to optimize (measure first)
- Still early enough to refactor

**Deliverables:**
- ✅ Proof generation <5 seconds
- ✅ Proof size documented
- ✅ Constraint count minimized
- ✅ Performance benchmarks recorded

### Day 5-6: Documentation + Export

**What to Document:**

**Circuit Specification (Day 5 morning):**
```markdown
# Wallet Ownership Circuit

## Purpose
Prove control of Solana wallet without revealing address

## Inputs
- secret_key (Field, private): Wallet secret key
- domain (Field, public): Domain name as field element

## Outputs
- nullifier (Field, public): Unique per wallet+domain
- commitment (Field, public): Proof of ownership

## Constraints
- Total: X constraints
- Proof size: Y bytes
- Proving time: Z seconds

## Security
- Nullifier collision resistance: [analysis]
- Domain scoping correctness: [proof]
```

**Export Verification Key (Day 5 afternoon):**
```bash
# Generate verification key
noir compile
noir generate-verification-key

# Export for Rust
cp target/veiled.vk ../programs/veiled-program/vk/

# Export for TypeScript
noir-tools export-vk --output ../sdk/vk.json
```

**Integration Tests (Day 6):**
```bash
# Test: Same wallet + same domain = same nullifier
test_same_wallet_same_domain()

# Test: Same wallet + different domain = different nullifier
test_same_wallet_different_domain()

# Test: Different wallet + same domain = different nullifier
test_different_wallet_same_domain()

# Test: Invalid secret key = proof fails
test_invalid_secret_key()
```

**Why 2 days:**
- Documentation often rushed (do it properly)
- Export format might need tweaking
- Integration tests catch design issues early

**Deliverables:**
- ✅ Circuit fully documented
- ✅ Verification key exported (Rust + JSON)
- ✅ Integration tests passing
- ✅ README with usage examples

### Day 7: Buffer / Start Week 2 Early

**If ahead:**
- Start Anchor program early
- Begin NFT ownership circuit
- Write blog post about circuits

**If behind:**
- Finish circuit optimization
- Fix failing tests
- Simplify if necessary (cut features)

**Why buffer day:**
- Week 1 is critical foundation
- Cannot proceed without working circuits
- Better to slip 1 day than ship broken foundation

---

## Week 2: On-Chain - Anchor Program

### Goals

Deploy working Anchor program to devnet that verifies proofs and stores nullifiers. By end of Week 2, must be able to submit proofs on-chain.

### Day 1-2: Anchor Program Core

**What to Build:**

**Project Structure (Day 1 morning):**
```
programs/veiled-program/
├─ src/
│  ├─ lib.rs              # Program entry point
│  ├─ instructions/
│  │  ├─ authenticate.rs  # Main instruction
│  │  └─ expire.rs        # Session expiry
│  ├─ state/
│  │  └─ nullifier.rs     # Account structure
│  ├─ errors.rs           # Custom errors
│  └─ verifier.rs         # Groth16 verification
├─ vk/
│  └─ veiled.vk           # From Week 1
└─ tests/
   └─ veiled.ts           # Integration tests
```

**Authenticate Instruction (Day 1 afternoon + Day 2):**
```rust
// programs/veiled-program/src/instructions/authenticate.rs

use anchor_lang::prelude::*;
use ark_groth16::{Proof, VerifyingKey};

#[derive(Accounts)]
pub struct Authenticate<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 50 + 8 + 8 + 32,
        seeds = [b"nullifier", nullifier.as_ref(), domain.as_bytes()],
        bump
    )]
    pub nullifier_account: Account<'info, NullifierAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Authenticate>,
    proof_bytes: Vec<u8>,
    nullifier: [u8; 32],
    commitment: [u8; 32],
    domain: String,
    expiry: i64,
) -> Result<()> {
    // Deserialize proof
    let proof = Proof::deserialize(&proof_bytes[..])?;
    
    // Load verification key
    let vk = load_verification_key()?;
    
    // Public inputs: nullifier + commitment
    let public_inputs = vec![nullifier, commitment];
    
    // Verify proof
    require!(
        verify_proof(&vk, &proof, &public_inputs),
        ErrorCode::InvalidProof
    );
    
    // Store nullifier
    let nullifier_account = &mut ctx.accounts.nullifier_account;
    nullifier_account.nullifier = nullifier;
    nullifier_account.domain = domain;
    nullifier_account.created_at = Clock::get()?.unix_timestamp;
    nullifier_account.expires_at = Clock::get()?.unix_timestamp + expiry;
    nullifier_account.commitment = commitment;
    
    msg!("Authentication successful");
    Ok(())
}
```

**Why 2 days:**
- Groth16 verification in Rust is complex
- arkworks-rs integration takes time
- Account structure needs careful design (rent-exempt, PDA seeds)

**Deliverables:**
- ✅ Anchor project builds
- ✅ Authenticate instruction compiles
- ✅ Account structure defined
- ✅ Verification key loaded correctly

### Day 3-4: Testing + Deployment

**Unit Tests (Day 3):**
```typescript
// tests/veiled.ts

describe("veiled-program", () => {
    it("Authenticates with valid proof", async () => {
        // Generate proof (using Noir)
        const proof = await generateProof(secretKey, domain);
        
        // Submit to program
        const tx = await program.methods
            .authenticate(proof.bytes, proof.nullifier, proof.commitment, "test.com", 86400)
            .accounts({...})
            .rpc();
        
        // Verify nullifier stored
        const account = await program.account.nullifierAccount.fetch(...);
        assert(account.nullifier.equals(proof.nullifier));
    });
    
    it("Rejects duplicate nullifier", async () => {
        // Authenticate once
        await authenticate(proof1);
        
        // Try again with same nullifier
        await assert.rejects(
            authenticate(proof1),  // Same proof
            /Duplicate nullifier/
        );
    });
    
    it("Rejects invalid proof", async () => {
        // Generate fake proof
        const fakeProof = generateFakeProof();
        
        // Should fail
        await assert.rejects(
            authenticate(fakeProof),
            /Invalid proof/
        );
    });
});
```

**Devnet Deployment (Day 4):**
```bash
# Configure Solana CLI for devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 2

# Build program
anchor build

# Deploy
anchor deploy

# Save program ID
echo "PROGRAM_ID=$(solana address -k target/deploy/veiled_program-keypair.json)" > .env
```

**Why 2 days:**
- Testing ZK proofs on-chain is slow
- Deployment can fail (account issues, SOL balance)
- Need time to debug devnet quirks

**Deliverables:**
- ✅ All tests passing
- ✅ Deployed to devnet
- ✅ Program ID saved
- ✅ Can call instructions from SDK

### Day 5-6: Integration + Optimization

**SDK Integration (Day 5):**
```typescript
// First version of SDK that calls on-chain program
import * as anchor from "@coral-xyz/anchor";

class VeiledAuth {
    async signIn(options) {
        // 1. Generate proof (from Week 1 circuit)
        const proof = await this.generateProof(options);
        
        // 2. Submit to Solana
        const tx = await this.program.methods
            .authenticate(
                proof.bytes,
                proof.nullifier,
                proof.commitment,
                options.domain,
                options.expiry || 86400
            )
            .accounts({
                nullifierAccount: this.deriveNullifierPDA(proof.nullifier, options.domain),
                authority: this.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        
        return { nullifier: proof.nullifier, txSignature: tx };
    }
}
```

**Gas Optimization (Day 6):**
```rust
// Optimize account sizes
#[account]
pub struct NullifierAccount {
    pub nullifier: [u8; 32],      // 32 bytes
    pub domain: String,            // Max 50 bytes (with length prefix)
    pub created_at: i64,           // 8 bytes
    pub expires_at: i64,           // 8 bytes
    pub commitment: [u8; 32],      // 32 bytes
    // Total: 130 bytes + 8 byte discriminator = 138 bytes
}

// Calculate rent
let rent = Rent::get()?.minimum_balance(138);
msg!("Rent required: {} lamports", rent);

// Optimize verification
// Cache verification key in program data
// Avoid repeated deserialization
```

**Why 2 days:**
- Integration always surfaces issues
- Gas costs must be reasonable (<$0.01 per auth)
- Time to refactor if costs too high

**Deliverables:**
- ✅ SDK can call program
- ✅ End-to-end flow working
- ✅ Gas costs documented
- ✅ Performance acceptable

### Day 7: Buffer / Start Week 3 Early

**If ahead:**
- Start SDK development
- Begin demo app
- Write documentation

**If behind:**
- Fix integration bugs
- Optimize gas further
- Simplify if necessary

---

## Week 3: Developer Tools - SDK + Demo

### Goals

Build SDK that developers will actually use, plus demo that shows it working. By end of Week 3, must have functional demo for video.

### Day 1-2: Core SDK

**What to Build:**

**Package Structure (Day 1 morning):**
```
packages/
├─ core/
│  ├─ src/
│  │  ├─ index.ts
│  │  ├─ VeiledAuth.ts
│  │  ├─ ProofGenerator.ts
│  │  ├─ RPCProvider.ts
│  │  └─ types.ts
│  └─ package.json
├─ circuit/
│  └─ (from Week 1)
├─ anchor/
│  └─ (from Week 2)
└─ cli/
   └─ (optional, post-MVP)
```

**Core Classes (Day 1 afternoon + Day 2):**
```typescript
// packages/core/src/VeiledAuth.ts

export class VeiledAuth {
    private program: Program;
    private wallet: WalletAdapter;
    private prover: ProofGenerator;
    private rpc: RPCProvider;
    
    constructor(config: VeiledConfig) {
        this.program = new Program(IDL, config.programId);
        this.wallet = config.wallet;
        this.prover = new ProofGenerator(config.wasmPath);
        this.rpc = RPCProvider.create(config.rpcProvider, config.rpcApiKey);
    }
    
    async signIn(options: SignInOptions): Promise<AuthResult> {
        // Step 1: Fetch wallet data if needed
        const walletData = await this.fetchWalletData(options.requirements);
        
        // Step 2: Generate proof
        const proof = await this.prover.generate({
            secretKey: await this.wallet.signMessage("veiled-auth"),
            requirements: options.requirements,
            domain: options.domain,
        });
        
        // Step 3: Submit to Solana
        const tx = await this.submitAuthentication(proof, options);
        
        // Step 4: Return result
        return {
            success: true,
            nullifier: proof.nullifier,
            txSignature: tx,
        };
    }
    
    async verifySession(nullifier: string): Promise<boolean> {
        const account = await this.program.account.nullifierAccount.fetch(...);
        return account.expiresAt > Date.now() / 1000;
    }
}
```

**Why 2 days:**
- WASM integration tricky (loading, memory management)
- Wallet adapter integration needs testing (Phantom, Backpack, Solflare)
- Error handling takes time (many failure modes)

**Deliverables:**
- ✅ @veiled/core package working
- ✅ Can generate proofs in browser
- ✅ Can submit to Solana
- ✅ Error handling robust

### Day 3-4: Demo Application

**What to Build:**

**SvelteKit App (Day 3):**
```bash
# Create SvelteKit project
# Demo app already exists in apps/demo (monorepo)
# If creating new: bun create svelte@latest demo
cd demo
npm install

# Add dependencies
bun add @veiled/core @solana/wallet-adapter-base @solana/wallet-adapter-wallets
```

**Pages (Day 3 afternoon + Day 4 morning):**
```
routes/
├─ +page.svelte              # Landing page
├─ demo/
│  ├─ +page.svelte          # Demo selector
│  ├─ chat/
│  │  └─ +page.svelte       # NFT-gated chat
│  └─ comparison/
│     └─ +page.svelte       # Normal vs Veiled
```

**Landing Page:**
```svelte
<!-- Explain problem, show solution -->
<h1>Veiled: Private Authentication for Solana</h1>
<p>Prove you own a wallet without revealing which wallet.</p>
<Button href="/demo">Try Demo</Button>
```

**Chat Demo (Day 4):**
```svelte
<script lang="ts">
    import { VeiledAuth } from '@veiled/core';
    import { WalletMultiButton } from '@solana/wallet-adapter-ui';
    
    let messages = [];
    let joined = false;
    
    async function joinChat() {
        const result = await $veiled.signIn({
            requirements: {
                wallet: true,
                nft: { collection: OKAY_BEARS }
            },
            domain: "veiled-demo-chat.vercel.app"
        });
        
        joined = true;
        messages = await fetchMessages();
    }
</script>

{#if !joined}
    <Button on:click={joinChat}>Join Chat (Prove Okay Bear)</Button>
{:else}
    <ChatMessages {messages} nullifier={$veiled.nullifier} />
{/if}
```

**Why 2 days:**
- First full integration (surfaces SDK issues)
- UI takes time (even simple)
- WebSocket for chat needs setup

**Deliverables:**
- ✅ Demo app working
- ✅ Can sign in with Veiled
- ✅ Chat shows messages
- ✅ Deployed to Vercel

### Day 5-6: Advanced Circuits + Integration

**NFT Ownership Circuit (Day 5):**
```noir
// circuits/nft_ownership/src/main.nr

fn main(
    secret_key: Field,
    nft_mint: Field,
    merkle_proof: [Field; 20],
    collection_root: pub Field,
    domain: pub Field
) -> pub (Field, bool) {
    // Verify wallet owns NFT
    let public_key = derive_pubkey(secret_key);
    
    // Verify NFT in collection (merkle proof)
    let is_valid = verify_merkle_proof(nft_mint, merkle_proof, collection_root);
    
    // Generate nullifier
    let nullifier = poseidon_hash([secret_key, domain]);
    
    (nullifier, is_valid)
}
```

**Balance Range Circuit (Day 6):**
```noir
// circuits/balance_range/src/main.nr

fn main(
    secret_key: Field,
    actual_balance: Field,
    minimum_required: pub Field,
    domain: pub Field
) -> pub (Field, bool) {
    let public_key = derive_pubkey(secret_key);
    
    // Range proof
    let sufficient = actual_balance >= minimum_required;
    
    let nullifier = poseidon_hash([secret_key, domain]);
    
    (nullifier, sufficient)
}
```

**SDK Integration (Day 6 afternoon):**
```typescript
// Add to @veiled/core

async signIn(options: SignInOptions): Promise<AuthResult> {
    // Determine which circuit to use
    const circuitType = this.determineCircuit(options.requirements);
    
    switch (circuitType) {
        case 'wallet':
            return this.prover.generateWalletProof(...);
        case 'nft':
            return this.prover.generateNFTProof(...);
        case 'balance':
            return this.prover.generateBalanceProof(...);
    }
}
```

**Why 2 days:**
- Additional circuits built on Week 1 foundation (faster)
- But each needs testing + integration
- Merkle tree generation for NFT collections takes time

**Deliverables:**
- ✅ NFT ownership circuit working
- ✅ Balance range circuit working
- ✅ SDK supports all three proof types
- ✅ Demo shows NFT gating

### Day 7: Buffer / Start Week 4 Early

**If ahead:**
- Start framework integrations
- Begin demo video script
- Write documentation

**If behind:**
- Finish circuit integration
- Fix demo bugs
- Simplify if necessary (cut balance circuit if needed)

---

## Week 4: Polish - Bounties + Presentation

### Goals

Multi-bounty submission package. Must have: polished demo, video, pitch deck, documentation. This week is about presentation (20% rule).

### Day 1-2: Framework Integrations

**Framework integrations (Day 1):**
```typescript
// * Framework wrappers are post-MVP (Week 4+ or post-hackathon).
// * For MVP, use @veiled/core directly in any framework.

// Example: Using @veiled/core in SvelteKit
import { VeiledAuth } from '@veiled/core';
import { onMount } from 'svelte';

let veiled: VeiledAuth;
let nullifier: string | null = null;

onMount(() => {
  veiled = new VeiledAuth({
    rpcProvider: 'helius',
    rpcApiKey: import.meta.env.VITE_HELIUS_KEY
  });
});

async function signIn() {
  const result = await veiled.signIn({
    requirements: { wallet: true },
    domain: window.location.hostname
  });
  nullifier = result.nullifier;
}
```

**Multi-RPC Support (Day 2):**
```typescript
// packages/core/src/RPCProvider.ts

export class RPCProvider {
    static create(provider: string, config: any): RPCProvider {
        switch (provider) {
            case 'helius':
                return new HeliusProvider(config.apiKey);
            case 'quicknode':
                return new QuicknodeProvider(config.url);
            case 'custom':
                return new CustomProvider(config.url);
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }
    }
}

class HeliusProvider implements RPCProvider {
    async getNFTs(wallet: PublicKey): Promise<NFT[]> {
        // Use Helius Enhanced API
        const helius = new Helius(this.apiKey);
        return helius.rpc.getAssetsByOwner({ ownerAddress: wallet });
    }
}
```

**Why 2 days:**
- Multi-RPC = Helius + Quicknode bounties (required)
- Framework examples show @veiled/core works everywhere
- Demo app uses SvelteKit (your preference)
- Framework wrappers are post-MVP (not required for submission)

**Deliverables:**
- ✅ @veiled/core published/usable
- ✅ Helius integration working
- ✅ Quicknode integration working
- ✅ README mentions sponsors

### Day 3-4: Comparison Mode + UI Polish

**Comparison Page (Day 3 morning):**
```svelte
<!-- routes/demo/comparison/+page.svelte -->

<div class="grid grid-cols-2 gap-8">
    <!-- Normal Auth -->
    <Card>
        <CardHeader>Normal "Sign In with Solana"</CardHeader>
        <CardContent>
            <WalletInfo address={wallet.publicKey} />
            <BalanceInfo balance={balance} />
            <NFTList nfts={nfts} />
            <Warning>⚠️ All data visible to dApp</Warning>
        </CardContent>
    </Card>
    
    <!-- Veiled Auth -->
    <Card>
        <CardHeader>"Sign In with Veiled"</CardHeader>
        <CardContent>
            <NullifierInfo nullifier={veiledResult.nullifier} />
            <ProofInfo hasBalance={true} />
            <ProofInfo hasNFT={true} />
            <Success>✓ Address hidden from dApp</Success>
        </CardContent>
    </Card>
</div>
```

**UI Polish (Day 3 afternoon + Day 4):**
```
Tasks:
- [ ] Landing page hero section
- [ ] Responsive mobile design
- [ ] Loading states (skeleton, spinners)
- [ ] Error messages (user-friendly)
- [ ] Success animations
- [ ] Code syntax highlighting (for SDK examples)
- [ ] Dark mode (optional)
```

**Why 2 days:**
- Comparison mode is demo centerpiece
- UI polish matters for judges (first impression)
- Animations make demo more impressive

**Deliverables:**
- ✅ Comparison mode working
- ✅ UI polished (no broken layouts)
- ✅ Mobile responsive
- ✅ Screenshots for pitch deck

### Day 5-6: Demo Video + Pitch Deck

**Demo Video Script (Day 5 morning):**
```markdown
# Veiled Demo Video (2-4 minutes)

## ACT 1: The Problem (30 seconds)
[Screen: Normal wallet auth]
"When you sign in with Solana, you expose everything."
[Show: Wallet address, balance, NFTs, transaction history]
"Your net worth. Your NFT collection. Every transaction."
[Show: Solscan page with full history]
"This is worse than Web2."

## ACT 2: The Solution (30 seconds)
[Screen: Veiled landing page]
"Veiled uses zero-knowledge proofs."
[Animation: ZK proof visualization]
"Prove you own a wallet WITHOUT revealing which wallet."
[Show: Comparison mode side-by-side]

## ACT 3: The Demo (60 seconds)
[Screen: Demo app]
"Watch: NFT-gated chat."
[Click: Connect wallet]
"I prove I own an Okay Bear."
[Show: Proof generating]
"The chat can't see which Okay Bear."
[Show: Joined chat, nullifier displayed]
"Or what else I own."
[Show: Address hidden, balance hidden]

## ACT 4: The Impact (30 seconds)
[Screen: Code examples]
"3 lines of code. OAuth-like API."
[Show: npm install, code snippet]
"Works with Phantom, Backpack, Solflare."
[Show: Wallet logos]
"Every Solana dApp needs authentication."
[Show: Use case list]
"Veiled makes it private."

## ACT 5: The Close (30 seconds)
[Screen: Logo]
"Veiled: Authentication. Veiled."
[Show: GitHub link, demo link]
"Open source. Built on Solana."
[Show: Sponsors: Helius, Quicknode, Aztec, Range]
```

**Video Recording (Day 5 afternoon):**
```bash
# Tools
- Screen recording: OBS Studio (free)
- Video editing: DaVinci Resolve (free) or iMovie
- Voiceover: Built-in mic (practice script 5+ times)
- Music: Epidemic Sound (optional, keep subtle)

# Process
1. Record screen (30 minutes)
2. Record voiceover (10 attempts, use best)
3. Edit video (cut pauses, add captions)
4. Export 1080p MP4
5. Upload to YouTube (unlisted)
```

**Pitch Deck (Day 6):**
```
Slide 1: Title
- "Veiled: Privacy-Preserving OAuth for Solana"
- Hackathon logo

Slide 2: Problem
- Web3 auth worse than Web2
- Everything exposed
- Screenshot of wallet explorer

Slide 3: Solution
- ZK proofs for authentication
- Selective disclosure
- Cross-site unlinkability

Slide 4: How It Works
- Diagram: User → Proof → Solana → dApp
- 3 steps: Generate, Verify, Authenticate

Slide 5: Demo
- Screenshots of comparison mode
- "Address hidden" highlighted

Slide 6: For Developers
- Code snippet (3 lines)
- "OAuth-like API"
- npm install command

Slide 7: Technical Stack
- Noir circuits (Aztec)
- Anchor program
- TypeScript SDK
- Helius/Quicknode RPC

Slide 8: Why Solana
- Fast proof verification (400ms)
- Cheap storage (<$0.01)
- Wallet ecosystem ready

Slide 9: Bounty Alignment
- Track 02: Privacy tooling ✓
- Helius: Enhanced API ✓
- Quicknode: Open source ✓
- Aztec: Noir circuits ✓
- Range: Selective disclosure ✓

Slide 10: Impact
- Every dApp needs auth
- 1000+ potential integrations
- Open source, ready to use

Slide 11: Thank You
- GitHub: github.com/user/veiled
- Demo: veiled.vercel.app
- Contact info
```

**Why 2 days:**
- Video is CRITICAL (judges watch first)
- Script must be tight (no rambling)
- Editing takes longer than expected
- Pitch deck supports written submission

**Deliverables:**
- ✅ Demo video (2-4 min)
- ✅ Pitch deck (11 slides)
- ✅ Video on YouTube
- ✅ Deck as PDF

### Day 7: Final Submission

**Morning (4 hours):**
```markdown
# Final checklist
- [ ] Demo deployed and working
- [ ] Video uploaded
- [ ] Pitch deck finalized
- [ ] README.md complete (installation, usage, architecture)
- [ ] GitHub repo public
- [ ] All bounty tags added
- [ ] Screenshots in repo
- [ ] License file (MIT)
```

**Afternoon (4 hours):**
```markdown
# Submission package
- [ ] Main track submission (Track 02)
- [ ] Helius bounty submission (link to RPC usage)
- [ ] Quicknode bounty submission (link to GitHub)
- [ ] Aztec bounty submission (link to circuits)
- [ ] Range bounty submission (link to selective disclosure)
- [ ] Tweet about submission
- [ ] Post in Discord #ship
```

**Evening:**
- Rest (you earned it)
- Respond to questions
- Monitor submission

---

## Risk Mitigation

### What If Things Go Wrong?

**Week 1 fails (circuits don't work):**
- Simplify circuit (remove EdDSA, just hash)
- Use existing circuit library
- Ask for help (Noir Discord)

**Week 2 fails (on-chain doesn't work):**
- Skip on-chain verification (verify in SDK)
- Use simpler program (just store nullifiers)
- Deploy to localnet only

**Week 3 fails (SDK too buggy):**
- Focus on one demo (drop comparison mode)
- Hardcode wallet (skip wallet adapter)
- Manual proof generation (skip SDK)

**Week 4 fails (no time for polish):**
- Skip framework integrations
- Basic video (screenshare + voiceover)
- Simple pitch deck (fewer slides)

### Critical Path

```
If you can ONLY do one thing each week:

Week 1: Working wallet ownership circuit
Week 2: Deploy program to devnet
Week 3: One demo that works end-to-end
Week 4: Demo video

This is minimum viable submission.
Everything else is bonus.
```

---

## Success Metrics

**Technical:**
- ✅ Proof generation <5 seconds
- ✅ On-chain verification <$0.01
- ✅ End-to-end flow working
- ✅ All tests passing

**Presentation:**
- ✅ Demo video <4 minutes
- ✅ Pitch deck <15 slides
- ✅ README covers all features
- ✅ GitHub stars >10 (share with friends)

**Bounties:**
- ✅ Uses Helius API (code evidence)
- ✅ Uses Quicknode option (code evidence)
- ✅ Uses Noir circuits (code evidence)
- ✅ Mentions Range (README or integration)
- ✅ All bounty tags applied

---

## Next Document

Read `05_BOUNTY_REQUIREMENTS.md` for specific requirements per bounty.
