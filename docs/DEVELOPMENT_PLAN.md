# Veiled Development Plan

**4-week build plan for Solana Privacy Hack 2026**

---

## Build Overview

### What We're Building

A privacy-preserving authentication system for Solana consisting of:

1. **Noir ZK Circuits** - Generate proofs of wallet ownership without revealing address
2. **Anchor Program** - Verify proofs on-chain and manage nullifier registry
3. **SDK Libraries** - JavaScript/TypeScript libraries for easy integration
4. **Demo Application** - NFT-gated chat to showcase the technology

### Why Each Component

| Component | Purpose | Priority |
|-----------|---------|----------|
| **Noir Circuits** | Core privacy - proves ownership without revealing wallet | 🔴 Critical |
| **Anchor Program** | On-chain verification - validates proofs cheaply on Solana | 🔴 Critical |
| **@veiled/core** | Developer experience - makes ZK accessible to normal devs | 🟡 High |
| **Demo App** | Proof of concept - shows real use case for judges | 🟡 High |
| **Framework wrappers (optional)** | Thin wrappers can be added post-MVP | 🟢 Medium |
| **Documentation** | Submission quality - judges need to understand it | 🔴 Critical |

---

## Week 1: Core Infrastructure (Jan 21-27)

**Goal:** Working ZK proof generation + basic on-chain verification

### Day 1-2: Noir Circuit Setup

**What to build:**
```
packages/circuit/
├── src/
│   ├── wallet_ownership.nr    # Main circuit
│   ├── lib.nr                 # Shared utilities
│   └── constants.nr           # Circuit parameters
├── Nargo.toml                 # Noir config
└── proofs/                    # Test proofs directory
```

**Technical specs:**

**wallet_ownership.nr:**
```noir
// Proves: User owns a Solana wallet
// Without revealing: The actual wallet address

use dep::std;

fn main(
    // PRIVATE INPUTS (never revealed)
    wallet_secret_key: [u8; 32],      // Ed25519 secret key
    random_secret: Field,              // Random value for nullifier
    
    // PUBLIC INPUTS (revealed to verifier)
    wallet_pubkey_hash: pub Field,     // Hash of public key
    domain_hash: pub Field,            // Hash of dApp domain
    nullifier: pub pub Field,          // Unique per wallet+domain
    timestamp: pub u64,                // Proof generation time
) {
    // 1. Derive public key from secret key
    let pubkey = std::ec::derive_public_key(wallet_secret_key);
    
    // 2. Verify pubkey hash matches
    let computed_hash = std::hash::poseidon::bn254::hash_1([pubkey]);
    assert(computed_hash == wallet_pubkey_hash);
    
    // 3. Compute and verify nullifier
    let computed_nullifier = std::hash::poseidon::bn254::hash_3([
        pubkey,
        domain_hash,
        random_secret
    ]);
    assert(computed_nullifier == nullifier);
    
    // 4. Verify timestamp is recent (within 5 minutes)
    let current_time = std::time::now();
    assert(timestamp <= current_time);
    assert(timestamp >= current_time - 300); // 5 min window
}
```

**Why these inputs:**
- `wallet_secret_key` - Proves ownership (only owner has this)
- `random_secret` - Makes nullifier unlinkable across sessions
- `domain_hash` - Different nullifier per website (privacy)
- `timestamp` - Prevents replay attacks

**Build tasks:**
- [ ] Install Noir/nargo (`curl -L https://install.noir-lang.org | bash`)
- [ ] Create circuit directory structure
- [ ] Implement basic wallet ownership circuit
- [ ] Write Noir tests (`nargo test`)
- [ ] Compile circuit (`nargo compile`)
- [ ] Generate proof of concept (`nargo prove`)
- [ ] Verify it works (`nargo verify`)

**Success criteria:**
- Circuit compiles without errors
- Test proof generates in <10 seconds
- Proof verification passes

### Day 3-4: Anchor Program Foundation

**What to build:**
```
packages/anchor/
├── programs/veiled/
│   └── src/
│       ├── lib.rs              # Main program
│       ├── instructions/
│       │   ├── verify_auth.rs  # Proof verification
│       │   └── init_nullifier.rs
│       ├── state/
│       │   └── nullifier.rs    # Account state
│       └── errors.rs           # Error codes
├── tests/
│   └── veiled.ts              # Integration tests
└── Anchor.toml
```

**Technical specs:**

**lib.rs:**
```rust
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqSGobuGUfnmenKc4VSwtr8P");

#[program]
pub mod veiled {
    use super::*;

    /// Initialize the program
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.total_auths = 0;
        Ok(())
    }

    /// Verify ZK proof and register nullifier
    pub fn verify_auth(
        ctx: Context<VerifyAuth>,
        proof: Vec<u8>,             // Groth16 proof
        public_inputs: Vec<u8>,     // Public signals
        nullifier: [u8; 32],        // Unique ID
    ) -> Result<()> {
        // TODO: Implement Groth16 verification
        // For MVP, we'll accept proof as valid
        // Week 2 will implement actual verification
        
        let nullifier_account = &mut ctx.accounts.nullifier_account;
        
        // Check nullifier not already used
        require!(
            !nullifier_account.is_used,
            ErrorCode::NullifierAlreadyUsed
        );
        
        // Mark as used
        nullifier_account.nullifier = nullifier;
        nullifier_account.is_used = true;
        nullifier_account.timestamp = Clock::get()?.unix_timestamp;
        nullifier_account.domain = ctx.accounts.domain.key();
        
        // Emit event
        emit!(AuthSuccessEvent {
            nullifier,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct VerifyAuth<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + NullifierAccount::LEN,
        seeds = [b"nullifier", nullifier.as_ref()],
        bump
    )]
    pub nullifier_account: Account<'info, NullifierAccount>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Domain identifier (can be any account)
    pub domain: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct NullifierAccount {
    pub nullifier: [u8; 32],
    pub is_used: bool,
    pub timestamp: i64,
    pub domain: Pubkey,
}

impl NullifierAccount {
    pub const LEN: usize = 32 + 1 + 8 + 32;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Nullifier already used")]
    NullifierAlreadyUsed,
}

#[event]
pub struct AuthSuccessEvent {
    pub nullifier: [u8; 32],
    pub timestamp: i64,
}
```

**Build tasks:**
- [ ] Install Anchor (`cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked`)
- [ ] Initialize Anchor project (`anchor init veiled`)
- [ ] Implement program structure above
- [ ] Write basic tests
- [ ] Deploy to devnet (`anchor deploy --provider.cluster devnet`)
- [ ] Test on devnet

**Success criteria:**
- Program deploys successfully
- Can create nullifier accounts
- Can verify basic "auth" (without real ZK verification yet)
- Tests pass

### Day 5-6: Core SDK Basics

**What to build:**
```
packages/core/
├── src/
│   ├── index.ts              # Main exports
│   ├── veiled.ts             # Veiled class
│   ├── proof/
│   │   ├── generator.ts      # Proof generation
│   │   └── circuit-loader.ts # Load Noir WASM
│   ├── solana/
│   │   ├── program.ts        # Anchor program interface
│   │   └── rpc.ts            # RPC helpers
│   └── types/
│       └── index.ts          # TypeScript types
├── package.json
└── tsconfig.json
```

**Technical specs:**

**veiled.ts:**
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { ProofGenerator } from './proof/generator';

export class VeiledAuth {
  private connection: Connection;
  private program: Program;
  private proofGenerator: ProofGenerator;

  constructor(config: VeiledConfig) {
    this.connection = new Connection(
      config.rpcUrl || this.getDefaultRPC(config.network)
    );
    
    this.proofGenerator = new ProofGenerator({
      circuitWasmUrl: config.circuitWasmUrl || DEFAULT_CIRCUIT_CDN,
    });
  }

  async signIn(options: SignInOptions): Promise<SignInResult> {
    // 1. Connect wallet
    const wallet = await this.getWallet();
    
    // 2. Generate proof (client-side)
    const { proof, publicInputs, nullifier } = await this.generateProof(
      wallet,
      options
    );
    
    // 3. Submit to Solana
    const signature = await this.submitProof(proof, publicInputs, nullifier);
    
    // 4. Return result
    return {
      nullifier: Buffer.from(nullifier).toString('base64'),
      verified: true,
      signature,
      expiresAt: Date.now() + (options.sessionDuration || 3600000),
    };
  }

  private async generateProof(
    wallet: any,
    options: SignInOptions
  ): Promise<ProofData> {
    // Load circuit if not loaded
    await this.proofGenerator.loadCircuit();
    
    // Prepare inputs
    const privateInputs = {
      wallet_secret_key: wallet.secretKey,
      random_secret: crypto.getRandomValues(new Uint8Array(32)),
    };
    
    const publicInputs = {
      wallet_pubkey_hash: this.hashPublicKey(wallet.publicKey),
      domain_hash: this.hashDomain(window.location.hostname),
      timestamp: Math.floor(Date.now() / 1000),
    };
    
    // Generate proof
    return await this.proofGenerator.prove(privateInputs, publicInputs);
  }

  private async submitProof(
    proof: Uint8Array,
    publicInputs: Uint8Array,
    nullifier: Uint8Array
  ): Promise<string> {
    // Create transaction to verify proof on-chain
    const tx = await this.program.methods
      .verifyAuth(
        Array.from(proof),
        Array.from(publicInputs),
        Array.from(nullifier)
      )
      .accounts({
        nullifierAccount: this.deriveNullifierPDA(nullifier),
        payer: this.wallet.publicKey,
        domain: new PublicKey(/* domain PDA */),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    return tx;
  }
}
```

**Build tasks:**
- [ ] Setup TypeScript package
- [ ] Implement Veiled class skeleton
- [ ] Add proof generator (mock for now)
- [ ] Add Anchor program integration
- [ ] Write unit tests
- [ ] Build package (`bun run build`)

**Success criteria:**
- Package builds successfully
- Can instantiate Veiled class
- Mock sign-in works
- Types are exported correctly

### Day 7: Week 1 Integration & Testing

**Build tasks:**
- [ ] End-to-end test: Generate proof → Submit → Verify
- [ ] Fix any integration issues
- [ ] Document what's working
- [ ] Create simple test UI (vanilla HTML)

**Success criteria:**
- Complete flow works: Browser → Circuit → Anchor → Verified
- Proof generation works (even if slow)
- On-chain verification succeeds

---

## Week 2: Advanced Circuits + App Registration (Jan 28 - Feb 3)

**Goal:** Multi-circuit support + on-chain app registration + comprehensive tests

### Day 8-9: Advanced Circuits (Balance Range + NFT Ownership)

### Day 8-9: Advanced Circuits (Balance Range + NFT Ownership)

**What to add:**

**packages/circuit/src/balance_range.nr:**
```noir
// Proves: Balance > minimum without revealing exact amount
use dep::std;

fn main(
    // PRIVATE
    wallet_secret_key: [u8; 32],
    actual_balance: Field,
    balance_merkle_proof: [Field; 20],
    random_secret: Field,
    
    // PUBLIC
    wallet_pubkey_hash: pub Field,
    minimum_balance: pub Field,
    balance_range_bucket: pub Field,  // 0=0-10, 1=10-100, 2=100-1000, etc.
    balance_merkle_root: pub Field,
    domain_hash: pub Field,
    nullifier: pub Field,
    timestamp: pub u64,
) {
    // 1. Verify wallet ownership
    let pubkey = std::ec::ed25519::derive_public_key(wallet_secret_key);
    let pubkey_field = bytes_to_field(pubkey);
    let computed_hash = std::hash::poseidon::bn254::hash_1([pubkey_field]);
    assert(computed_hash == wallet_pubkey_hash);
    
    // 2. Verify balance meets minimum
    assert(actual_balance >= minimum_balance);
    
    // 3. Verify balance is in declared range bucket
    let lower = power_of_10(balance_range_bucket);
    let upper = power_of_10(balance_range_bucket + 1);
    assert(actual_balance >= lower);
    assert(actual_balance < upper);
    
    // 4. Verify balance merkle proof (from RPC data)
    let computed_root = verify_merkle_path(
        actual_balance,
        balance_merkle_proof
    );
    assert(computed_root == balance_merkle_root);
    
    // 5. Generate nullifier
    let computed_nullifier = std::hash::poseidon::bn254::hash_3([
        pubkey_field,
        domain_hash,
        random_secret
    ]);
    assert(computed_nullifier == nullifier);
    
    // 6. Verify timestamp
    assert(timestamp <= current_timestamp());
    assert(timestamp >= current_timestamp() - 300);
}

fn power_of_10(exp: Field) -> Field {
    let mut result: Field = 1;
    for i in 0..exp {
        result = result * 10;
    }
    result
}

fn verify_merkle_path(leaf: Field, proof: [Field; 20]) -> Field {
    let mut current = leaf;
    for i in 0..20 {
        if proof[i] != 0 {
            current = std::hash::poseidon::bn254::hash_2([current, proof[i]]);
        }
    }
    current
}
```

**packages/circuit/src/nft_ownership.nr:**
```noir
// Proves: Owns NFT from collection without revealing which token
use dep::std;

fn main(
    // PRIVATE
    wallet_secret_key: [u8; 32],
    nft_mint_address: Field,
    nft_merkle_proof: [Field; 20],
    random_secret: Field,
    
    // PUBLIC
    wallet_pubkey_hash: pub Field,
    collection_address: pub Field,
    collection_merkle_root: pub Field,
    domain_hash: pub Field,
    nullifier: pub Field,
    timestamp: pub u64,
) {
    // 1. Verify wallet ownership
    let pubkey = std::ec::ed25519::derive_public_key(wallet_secret_key);
    let pubkey_field = bytes_to_field(pubkey);
    let computed_hash = std::hash::poseidon::bn254::hash_1([pubkey_field]);
    assert(computed_hash == wallet_pubkey_hash);
    
    // 2. Verify NFT belongs to collection (merkle proof)
    let computed_root = verify_merkle_path(
        nft_mint_address,
        nft_merkle_proof
    );
    assert(computed_root == collection_merkle_root);
    
    // 3. Generate nullifier
    let computed_nullifier = std::hash::poseidon::bn254::hash_3([
        pubkey_field,
        domain_hash,
        random_secret
    ]);
    assert(computed_nullifier == nullifier);
    
    // 4. Verify timestamp
    assert(timestamp <= current_timestamp());
    assert(timestamp >= current_timestamp() - 300);
}
```

**Build tasks:**
- [ ] Implement balance_range.nr circuit
- [ ] Implement nft_ownership.nr circuit
- [ ] Write comprehensive tests for each circuit
- [ ] Test with real Solana wallet data
- [ ] Optimize constraint counts (<15k per circuit)
- [ ] Compile all circuits (`nargo compile`)
- [ ] Generate benchmark data

**Testing requirements:**
```noir
// tests/balance_range.nr
#[test]
fn test_valid_balance_proof() {
    let balance = 573; // 573 SOL
    let minimum = 100;
    let bucket = 2; // 100-1000 range
    // Should pass
}

#[test]
fn test_balance_below_minimum() {
    let balance = 50;
    let minimum = 100;
    // Should fail
}

#[test]
fn test_balance_wrong_bucket() {
    let balance = 573;
    let bucket = 1; // Claims 10-100 but is actually 100-1000
    // Should fail
}

// tests/nft_ownership.nr
#[test]
fn test_valid_nft_proof() {
    let nft_mint = field_from_address("NFT123...");
    let collection_root = compute_merkle_root(collection_nfts);
    // Should pass
}

#[test]
fn test_nft_not_in_collection() {
    let fake_nft = field_from_address("FAKE...");
    // Should fail
}
```

**Success criteria:**
- All 3 circuits compile successfully
- Balance proofs work with real SOL amounts
- NFT proofs work with real collection data
- All tests pass
- Constraint counts: wallet=10k, balance=12k, nft=11k

### Day 10-11: On-Chain App Registration

**What to build:**

**Anchor program additions:**

```rust
// programs/veiled/src/instructions/register_app.rs
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(domain: String)]
pub struct RegisterApp<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + AppAccount::MAX_SIZE,
        seeds = [b"app", domain.as_bytes()],
        bump
    )]
    pub app_account: Account<'info, AppAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handle_register_app(
    ctx: Context<RegisterApp>,
    domain: String,
    name: String,
    description: String,
    logo_url: String,
    contact: String,
    category: AppCategory,
) -> Result<()> {
    require!(domain.len() <= 64, ErrorCode::DomainTooLong);
    require!(name.len() <= 64, ErrorCode::NameTooLong);
    require!(logo_url.len() <= 256, ErrorCode::UrlTooLong);
    
    let app = &mut ctx.accounts.app_account;
    app.domain = domain;
    app.name = name;
    app.description = description;
    app.logo_url = logo_url;
    app.contact = contact;
    app.category = category;
    app.authority = ctx.accounts.authority.key();
    app.created_at = Clock::get()?.unix_timestamp;
    app.total_auths = 0;
    app.is_active = true;
    app.verified = false; // Manual verification later
    app.bump = ctx.bumps.app_account;
    
    emit!(AppRegisteredEvent {
        app_id: app.key(),
        domain: app.domain.clone(),
        authority: app.authority,
    });
    
    Ok(())
}

// programs/veiled/src/state/app.rs
#[account]
pub struct AppAccount {
    pub domain: String,           // 4 + 64 = 68
    pub name: String,             // 4 + 64 = 68
    pub description: String,      // 4 + 256 = 260
    pub logo_url: String,         // 4 + 256 = 260
    pub contact: String,          // 4 + 64 = 68
    pub category: AppCategory,    // 1
    pub authority: Pubkey,        // 32
    pub created_at: i64,          // 8
    pub total_auths: u64,         // 8
    pub is_active: bool,          // 1
    pub verified: bool,           // 1 (manual verification)
    pub bump: u8,                 // 1
}

impl AppAccount {
    pub const MAX_SIZE: usize = 68 + 68 + 260 + 260 + 68 + 1 + 32 + 8 + 8 + 1 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum AppCategory {
    DeFi,
    NFT,
    Gaming,
    Social,
    DAO,
    Tooling,
    Other,
}

#[event]
pub struct AppRegisteredEvent {
    pub app_id: Pubkey,
    pub domain: String,
    pub authority: Pubkey,
}

// Update verify_auth to track app usage
pub fn handle_verify_auth(
    ctx: Context<VerifyAuth>,
    proof: Vec<u8>,
    public_inputs: Vec<u8>,
    nullifier: [u8; 32],
    app_id: Option<Pubkey>, // NEW: Optional app registration
) -> Result<()> {
    // ... existing verification logic ...
    
    // Increment app auth count if registered
    if let Some(app_id) = app_id {
        if let Some(app_account) = ctx.accounts.app_account {
            app_account.total_auths = app_account.total_auths.checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
        }
    }
    
    Ok(())
}
```

**SDK integration:**

```typescript
// packages/sdk/src/app-registration.ts
export class AppRegistration {
  private program: Program;
  private connection: Connection;
  
  async registerApp(params: {
    domain: string;
    name: string;
    description: string;
    logoUrl: string;
    contact: string;
    category: 'defi' | 'nft' | 'gaming' | 'social' | 'dao' | 'tooling' | 'other';
  }): Promise<{ appId: PublicKey; signature: string }> {
    const [appPDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('app'), Buffer.from(params.domain)],
      this.program.programId
    );
    
    const tx = await this.program.methods
      .registerApp(
        params.domain,
        params.name,
        params.description,
        params.logoUrl,
        params.contact,
        { [params.category]: {} }
      )
      .accounts({
        appAccount: appPDA,
        authority: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    return { appId: appPDA, signature: tx };
  }
  
  async getApp(domain: string): Promise<AppAccount | null> {
    const [appPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('app'), Buffer.from(domain)],
      this.program.programId
    );
    
    try {
      const account = await this.program.account.appAccount.fetch(appPDA);
      return account;
    } catch {
      return null;
    }
  }
  
  async listApps(category?: string): Promise<AppAccount[]> {
    const apps = await this.program.account.appAccount.all();
    
    if (category) {
      return apps.filter(app => 
        app.account.category.toString().toLowerCase() === category
      );
    }
    
    return apps.map(app => app.account);
  }
}

// Add to Veiled class
export class Veiled extends EventEmitter {
  public apps: AppRegistration;
  
  constructor(config: VeiledConfig) {
    super();
    // ... existing setup ...
    this.apps = new AppRegistration(this.program, this.connection);
  }
}
```

**CLI tool:**

```typescript
// packages/cli/src/commands/register.ts
import { Command } from 'commander';
import { Veiled } from '@veiled/sdk';

const program = new Command();

program
  .command('register')
  .description('Register your app on-chain')
  .requiredOption('-d, --domain <domain>', 'App domain (e.g., myapp.com)')
  .requiredOption('-n, --name <name>', 'App name')
  .requiredOption('-l, --logo <url>', 'Logo URL')
  .option('-c, --category <category>', 'Category', 'other')
  .option('--description <desc>', 'Description', '')
  .option('--contact <email>', 'Contact email', '')
  .action(async (options) => {
    const veiled = new VeiledAuth({ network: 'devnet' });
    
    console.log('Registering app on Solana...');
    console.log(`Domain: ${options.domain}`);
    console.log(`Estimated cost: ~0.01 SOL\n`);
    
    const { appId, signature } = await veiled.apps.registerApp({
      domain: options.domain,
      name: options.name,
      description: options.description,
      logoUrl: options.logo,
      contact: options.contact,
      category: options.category,
    });
    
    console.log('✅ App registered successfully!');
    console.log(`App ID: ${appId.toBase58()}`);
    console.log(`Transaction: ${signature}`);
    console.log(`\nView at: https://veiled.sh/apps/${appId.toBase58()}`);
  });

program.parse();
```

**Build tasks:**
- [ ] Add RegisterApp instruction to Anchor program
- [ ] Add AppAccount state structure
- [ ] Implement app registration in SDK
- [ ] Create CLI tool for registration
- [ ] Write tests for registration flow
- [ ] Test on devnet with real registration
- [ ] Document registration cost (~0.01 SOL)

**Success criteria:**
- Can register app on devnet
- App info stored on-chain
- CLI tool works
- Cost confirmed at ~0.01 SOL
- Tests pass

### Day 12-13: Comprehensive Testing Suite

### Day 12-13: Comprehensive Testing Suite

**What to build:**

**Circuit Tests (Noir):**
```
packages/circuit/tests/
├── wallet_ownership_test.nr
├── balance_range_test.nr
├── nft_ownership_test.nr
└── utils.nr
```

```noir
// tests/wallet_ownership_test.nr
use crate::main;

#[test]
fn test_valid_wallet_proof() {
    let secret_key = test_keypair();
    let pubkey = derive_public_key(secret_key);
    let pubkey_hash = hash(pubkey);
    let domain_hash = hash("test.com");
    let random_secret = field(12345);
    let nullifier = hash([pubkey, domain_hash, random_secret]);
    let timestamp = current_timestamp();
    
    // Should succeed
    main(secret_key, random_secret, pubkey_hash, domain_hash, nullifier, timestamp);
}

#[test(should_fail)]
fn test_wrong_pubkey_hash() {
    let secret_key = test_keypair();
    let wrong_hash = hash("wrong");
    // ... rest of inputs
    
    // Should fail - pubkey hash doesn't match
    main(secret_key, random_secret, wrong_hash, domain_hash, nullifier, timestamp);
}

#[test(should_fail)]
fn test_expired_timestamp() {
    let old_timestamp = current_timestamp() - 600; // 10 minutes old
    
    // Should fail - timestamp too old
    main(secret_key, random_secret, pubkey_hash, domain_hash, nullifier, old_timestamp);
}

#[test(should_fail)]
fn test_wrong_nullifier() {
    let wrong_nullifier = hash([pubkey, domain_hash, field(99999)]);
    
    // Should fail - nullifier doesn't match
    main(secret_key, random_secret, pubkey_hash, domain_hash, wrong_nullifier, timestamp);
}

#[test]
fn test_same_wallet_different_domains() {
    let domain1 = hash("app1.com");
    let domain2 = hash("app2.com");
    let nullifier1 = hash([pubkey, domain1, random_secret]);
    let nullifier2 = hash([pubkey, domain2, random_secret]);
    
    // Nullifiers should be different
    assert(nullifier1 != nullifier2);
}
```

```noir
// tests/balance_range_test.nr
#[test]
fn test_valid_balance_range() {
    let balance = field(573); // 573 SOL
    let minimum = field(100);
    let bucket = field(2); // 100-1000 range
    
    // Should succeed
    main(secret_key, balance, merkle_proof, random_secret,
         pubkey_hash, minimum, bucket, merkle_root, domain_hash, nullifier, timestamp);
}

#[test(should_fail)]
fn test_balance_below_minimum() {
    let balance = field(50);
    let minimum = field(100);
    
    // Should fail
    main(...);
}

#[test(should_fail)]
fn test_balance_wrong_bucket() {
    let balance = field(573); // Actually 100-1000
    let bucket = field(1); // Claims 10-100
    
    // Should fail - balance not in claimed bucket
    main(...);
}

#[test(should_fail)]
fn test_invalid_merkle_proof() {
    let wrong_proof = [field(0); 20];
    
    // Should fail - merkle proof doesn't verify
    main(secret_key, balance, wrong_proof, ...);
}
```

**Anchor Tests (TypeScript):**
```typescript
// packages/anchor/tests/veiled.test.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert, expect } from "chai";

describe("Veiled Program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Veiled as Program<Veiled>;

  describe("App Registration", () => {
    it("Registers an app successfully", async () => {
      const domain = "test.com";
      const [appPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("app"), Buffer.from(domain)],
        program.programId
      );

      const tx = await program.methods
        .registerApp(
          domain,
          "Test App",
          "A test application",
          "https://test.com/logo.png",
          "test@test.com",
          { defi: {} }
        )
        .accounts({
          appAccount: appPDA,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const app = await program.account.appAccount.fetch(appPDA);
      assert.equal(app.domain, domain);
      assert.equal(app.name, "Test App");
      assert.equal(app.totalAuths.toNumber(), 0);
      assert.equal(app.isActive, true);
      assert.equal(app.verified, false);
    });

    it("Prevents duplicate registration", async () => {
      try {
        // Try to register same domain again
        await program.methods.registerApp(...).rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        expect(err.message).to.include("already in use");
      }
    });

    it("Validates domain length", async () => {
      const longDomain = "a".repeat(100);
      try {
        await program.methods
          .registerApp(longDomain, ...)
          .rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        expect(err.message).to.include("DomainTooLong");
      }
    });
  });

  describe("Authentication", () => {
    let appPDA: PublicKey;

    before(async () => {
      // Register app first
      const domain = "authtest.com";
      [appPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("app"), Buffer.from(domain)],
        program.programId
      );
      await program.methods.registerApp(domain, ...).rpc();
    });

    it("Verifies auth and increments count", async () => {
      const nullifier = Buffer.from(new Uint8Array(32).fill(1));
      const [nullifierPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("nullifier"), nullifier],
        program.programId
      );

      // Submit auth (with mock proof for now)
      const proof = Array.from(new Uint8Array(256));
      const publicInputs = Array.from(new Uint8Array(128));

      const tx = await program.methods
        .verifyAuth(proof, publicInputs, Array.from(nullifier), appPDA)
        .accounts({
          nullifierAccount: nullifierPDA,
          appAccount: appPDA,
          payer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Check nullifier marked as used
      const nullifierAccount = await program.account.nullifierAccount.fetch(nullifierPDA);
      assert.equal(nullifierAccount.isUsed, true);

      // Check app auth count incremented
      const app = await program.account.appAccount.fetch(appPDA);
      assert.equal(app.totalAuths.toNumber(), 1);
    });

    it("Prevents nullifier reuse", async () => {
      const nullifier = Buffer.from(new Uint8Array(32).fill(1));
      
      try {
        // Try to use same nullifier again
        await program.methods.verifyAuth(..., Array.from(nullifier), appPDA).rpc();
        assert.fail("Should have thrown error");
      } catch (err) {
        expect(err.message).to.include("NullifierAlreadyUsed");
      }
    });
  });

  describe("App Queries", () => {
    it("Lists all apps", async () => {
      const apps = await program.account.appAccount.all();
      assert.isAtLeast(apps.length, 2); // We registered 2 in previous tests
    });

    it("Fetches app by domain", async () => {
      const domain = "test.com";
      const [appPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("app"), Buffer.from(domain)],
        program.programId
      );

      const app = await program.account.appAccount.fetch(appPDA);
      assert.equal(app.domain, domain);
    });
  });
});
```

**SDK Tests (Bun):**
```typescript
// packages/sdk/tests/veiled.test.ts
import { expect, test, describe, beforeAll } from 'bun:test';
import { Veiled } from '../src/veiled';
import { Keypair } from '@solana/web3.js';

describe('Veiled SDK', () => {
  let veiled: Veiled;

  beforeAll(() => {
    veiled = new VeiledAuth({ network: 'devnet' });
  });

  describe('Initialization', () => {
    test('creates instance', () => {
      expect(veiled).toBeDefined();
    });

    test('has event emitter methods', () => {
      expect(veiled.on).toBeDefined();
      expect(veiled.emit).toBeDefined();
    });
  });

  describe('App Registration', () => {
    test('registers app successfully', async () => {
      const result = await veiled.apps.registerApp({
        domain: `test-${Date.now()}.com`,
        name: 'Test App',
        description: 'Test',
        logoUrl: 'https://test.com/logo.png',
        contact: 'test@test.com',
        category: 'tooling',
      });

      expect(result.appId).toBeDefined();
      expect(result.signature).toBeDefined();
    });

    test('fetches registered app', async () => {
      const domain = 'test.com';
      const app = await veiled.apps.getApp(domain);
      
      if (app) {
        expect(app.domain).toBe(domain);
        expect(app.isActive).toBe(true);
      }
    });

    test('lists apps by category', async () => {
      const apps = await veiled.apps.listApps('defi');
      expect(apps).toBeArray();
      apps.forEach(app => {
        expect(app.category).toBe('defi');
      });
    });
  });

  describe('Events', () => {
    test('emits auth:started event', async () => {
      let eventFired = false;
      veiled.on('auth:started', () => {
        eventFired = true;
      });

      veiled.emit('auth:started');
      expect(eventFired).toBe(true);
    });

    test('emits proof:generating with progress', async () => {
      const progress: number[] = [];
      veiled.on('proof:generating', (data) => {
        progress.push(data.progress);
      });

      veiled.emit('proof:generating', { progress: 0 });
      veiled.emit('proof:generating', { progress: 50 });
      veiled.emit('proof:generating', { progress: 100 });

      expect(progress).toEqual([0, 50, 100]);
    });
  });

  describe('Session Management', () => {
    test('getSession returns null when no session', () => {
      const session = veiled.getSession();
      expect(session).toBeNull();
    });

    test('stores session after signIn', async () => {
      // Mock signIn (we'll test real flow in e2e)
      veiled['session'] = {
        nullifier: 'test123',
        verified: true,
        signature: 'sig123',
        expiresAt: Date.now() + 3600000,
        appId: 'test.com',
      };

      const session = veiled.getSession();
      expect(session).toBeDefined();
      expect(session?.nullifier).toBe('test123');
    });

    test('clears session on signOut', () => {
      veiled.signOut();
      const session = veiled.getSession();
      expect(session).toBeNull();
    });

    test('expires old sessions', () => {
      veiled['session'] = {
        nullifier: 'test123',
        verified: true,
        signature: 'sig123',
        expiresAt: Date.now() - 1000, // Expired
        appId: 'test.com',
      };

      const session = veiled.getSession();
      expect(session).toBeNull();
    });
  });
});
```

**Integration Tests (E2E):**
```typescript
// packages/sdk/tests/integration.test.ts
import { test, describe, beforeAll } from 'bun:test';
import { Veiled } from '../src/veiled';
import { Keypair, Connection } from '@solana/web3.js';

describe('Integration Tests', () => {
  let veiled: Veiled;
  let testWallet: Keypair;

  beforeAll(async () => {
    veiled = new VeiledAuth({ network: 'devnet' });
    testWallet = Keypair.generate();
    
    // Airdrop some SOL for testing
    const connection = new Connection('https://api.devnet.solana.com');
    const airdrop = await connection.requestAirdrop(
      testWallet.publicKey,
      1_000_000_000 // 1 SOL
    );
    await connection.confirmTransaction(airdrop);
  });

  test('Full auth flow: wallet ownership', async () => {
    // This would test actual proof generation + verification
    // Skip in CI, run manually with real wallet
    test.skip();
  });

  test('Full auth flow: balance range', async () => {
    test.skip();
  });

  test('Full auth flow: NFT ownership', async () => {
    test.skip();
  });
});
```

**Performance Tests:**
```typescript
// packages/sdk/tests/performance.test.ts
import { test, describe } from 'bun:test';
import { Veiled } from '../src/veiled';

describe('Performance Tests', () => {
  test('Proof generation completes in <5 seconds', async () => {
    const start = Date.now();
    
    // Generate proof
    // await veiled.generateProof(...);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test('Modal shows in <100ms', () => {
    const start = Date.now();
    
    const modal = new Modal({ theme: 'dark' });
    modal.show();
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('Session check is instant', () => {
    const veiled = new VeiledAuth({ network: 'devnet' });
    
    const start = Date.now();
    veiled.getSession();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1);
  });
});
```

**Build tasks:**
- [ ] Write all circuit tests (15+ tests per circuit)
- [ ] Write Anchor program tests (20+ tests)
- [ ] Write SDK unit tests (30+ tests)
- [ ] Write integration tests (10+ tests)
- [ ] Write performance tests (5+ tests)
- [ ] Set up CI/CD to run tests
- [ ] Achieve >80% code coverage
- [ ] Document test execution

**Success criteria:**
- All tests pass
- >80% code coverage
- Performance benchmarks met
- CI/CD green

### Day 14: Week 2 Polish & RPC Integration

**What to build:**

```typescript
// src/rpc/provider.ts
export class RPCProvider {
  private helius?: Helius;
  private connection: Connection;
  
  constructor(config: RPCConfig) {
    if (config.provider === 'helius') {
      this.helius = new Helius(config.apiKey);
      this.connection = this.helius.connection;
    } else {
      this.connection = new Connection(config.rpcUrl);
    }
  }
  
  async fetchNFTs(wallet: PublicKey): Promise<NFT[]> {
    if (this.helius) {
      // Use enhanced Helius APIs
      const response = await this.helius.rpc.getAssetsByOwner({
        ownerAddress: wallet.toBase58(),
        page: 1,
      });
      return response.items;
    } else {
      // Fallback to standard RPC
      return await this.fetchNFTsStandard(wallet);
    }
  }
}
```

**Build tasks:**
- [ ] Add Helius SDK integration
- [ ] Add Quicknode RPC support
- [ ] Implement NFT fetching
- [ ] Implement balance checking
- [ ] Add WebSocket support (Helius)
- [ ] Write integration tests

**Why this matters:**
- Helius bounty ($5k) requires using their APIs
- Quicknode bounty ($3k) requires supporting their RPC
- Both improve developer experience

### Day 14: Week 2 Polish

- [ ] Documentation updates
- [ ] Performance testing
- [ ] Bug fixes
- [ ] Code cleanup

---

## Week 3: App Directory + Demo (Feb 4-10)

**Goal:** App directory with verified badges + working demo application

### Day 15-16: App Directory & Analytics Dashboard

### Day 15-16: App Directory & Analytics Dashboard

**What to build:**

**App Directory (SvelteKit):**
```
apps/web/
├── src/
│   ├── routes/
│   │   ├── apps/
│   │   │   ├── +page.svelte          # App directory listing
│   │   │   ├── +page.server.ts       # Fetch apps from chain
│   │   │   ├── [id]/
│   │   │   │   ├── +page.svelte      # App detail page
│   │   │   │   └── +page.server.ts   # Fetch single app
│   │   │   └── categories/
│   │   │       └── [category]/
│   │   │           └── +page.svelte  # Filtered by category
│   │   └── dashboard/
│   │       └── +page.svelte          # Developer dashboard
│   └── lib/
│       ├── components/
│       │   ├── AppCard.svelte
│       │   ├── AppGrid.svelte
│       │   ├── VerifiedBadge.svelte
│       │   ├── StatsCard.svelte
│       │   └── AnalyticsChart.svelte
│       └── solana/
│           └── fetch-apps.ts
```

**App Directory Page:**
```svelte
<!-- routes/apps/+page.svelte -->
<script lang="ts">
  import { AppGrid, VerifiedBadge } from '$lib/components';
  
  export let data;
  let { apps, categories, stats } = data;
  let selectedCategory = 'all';
  
  $: filteredApps = selectedCategory === 'all' 
    ? apps 
    : apps.filter(app => app.category === selectedCategory);
</script>

<div class="app-directory">
  <header>
    <h1>App Directory</h1>
    <p>{stats.totalApps} apps building with Veiled</p>
  </header>

  <!-- Category filter -->
  <div class="categories">
    <button on:click={() => selectedCategory = 'all'}>
      All ({apps.length})
    </button>
    {#each categories as category}
      <button on:click={() => selectedCategory = category.id}>
        {category.name} ({category.count})
      </button>
    {/each}
  </div>

  <!-- App grid -->
  <div class="grid">
    {#each filteredApps as app}
      <div class="app-card">
        <img src={app.logoUrl} alt={app.name} />
        <h3>
          {app.name}
          {#if app.verified}
            <VerifiedBadge />
          {/if}
        </h3>
        <p>{app.description}</p>
        <div class="stats">
          <span>👥 {app.totalAuths.toLocaleString()} users</span>
          <span>{app.category}</span>
        </div>
        <a href="/apps/{app.id}">View Details →</a>
      </div>
    {/each}
  </div>
</div>

<style>
  .app-directory {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }

  .app-card {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.5rem;
    transition: transform 0.2s;
  }

  .app-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }

  .stats {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    font-size: 0.875rem;
    color: #6b7280;
  }
</style>
```

**Server-side data fetching:**
```typescript
// routes/apps/+page.server.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const connection = new Connection(process.env.HELIUS_RPC_URL!);
  const provider = new AnchorProvider(connection, null as any, {});
  const program = new Program(IDL, PROGRAM_ID, provider);

  // Fetch all registered apps
  const apps = await program.account.appAccount.all();

  // Calculate stats
  const totalAuths = apps.reduce((sum, app) => 
    sum + app.account.totalAuths.toNumber(), 0
  );

  const categories = [
    { id: 'defi', name: 'DeFi', count: apps.filter(a => a.account.category === 'defi').length },
    { id: 'nft', name: 'NFT', count: apps.filter(a => a.account.category === 'nft').length },
    { id: 'gaming', name: 'Gaming', count: apps.filter(a => a.account.category === 'gaming').length },
    { id: 'social', name: 'Social', count: apps.filter(a => a.account.category === 'social').length },
    { id: 'dao', name: 'DAO', count: apps.filter(a => a.account.category === 'dao').length },
  ];

  return {
    apps: apps.map(app => ({
      id: app.publicKey.toBase58(),
      ...app.account,
      totalAuths: app.account.totalAuths.toNumber(),
    })),
    categories,
    stats: {
      totalApps: apps.length,
      totalAuths,
      verifiedApps: apps.filter(a => a.account.verified).length,
    }
  };
};
```

**App Detail Page:**
```svelte
<!-- routes/apps/[id]/+page.svelte -->
<script lang="ts">
  import { VerifiedBadge, AnalyticsChart } from '$lib/components';
  
  export let data;
  let { app, analytics } = data;
</script>

<div class="app-detail">
  <header>
    <img src={app.logoUrl} alt={app.name} class="logo" />
    <div>
      <h1>
        {app.name}
        {#if app.verified}
          <VerifiedBadge tooltip="Verified by Veiled" />
        {/if}
      </h1>
      <a href="https://{app.domain}" target="_blank" rel="noopener">
        {app.domain} ↗
      </a>
    </div>
  </header>

  <p class="description">{app.description}</p>

  <!-- Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-value">{app.totalAuths.toLocaleString()}</span>
      <span class="stat-label">Total Authentications</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{app.category}</span>
      <span class="stat-label">Category</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">
        {new Date(app.createdAt * 1000).toLocaleDateString()}
      </span>
      <span class="stat-label">Registered</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{app.isActive ? '✅ Active' : '❌ Inactive'}</span>
      <span class="stat-label">Status</span>
    </div>
  </div>

  <!-- Analytics chart -->
  {#if analytics}
    <section>
      <h2>Usage Over Time</h2>
      <AnalyticsChart data={analytics} />
    </section>
  {/if}

  <!-- Integration example -->
  <section class="integration">
    <h2>Integration Example</h2>
    <pre><code>{`import Veiled from '@veiled/sdk';

const veiled = new VeiledAuth({ 
  network: 'mainnet',
  appId: '${app.id}'
});

const user = await veiled.signIn({
  prove: ['owns_wallet']
});`}</code></pre>
  </section>

  <!-- Contact -->
  {#if app.contact}
    <div class="contact">
      <p>Questions? Contact: <a href="mailto:{app.contact}">{app.contact}</a></p>
    </div>
  {/if}
</div>
```

**Developer Dashboard:**
```svelte
<!-- routes/dashboard/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Veiled } from '@veiled/sdk';
  import { WalletMultiButton } from '@solana/wallet-adapter-svelte';
  
  let veiled: Veiled;
  let myApps = [];
  let selectedApp = null;
  
  onMount(async () => {
    veiled = new VeiledAuth({ network: 'mainnet' });
  });
  
  async function loadMyApps(walletPubkey) {
    const allApps = await veiled.apps.listApps();
    myApps = allApps.filter(app => 
      app.authority.toBase58() === walletPubkey.toBase58()
    );
  }
  
  async function registerNewApp(formData) {
    const result = await veiled.apps.registerApp(formData);
    myApps = [...myApps, result];
  }
</script>

<div class="dashboard">
  <header>
    <h1>Developer Dashboard</h1>
    <WalletMultiButton on:connect={e => loadMyApps(e.detail)} />
  </header>

  {#if myApps.length === 0}
    <div class="empty-state">
      <h2>No apps registered yet</h2>
      <p>Register your first app to start using Veiled authentication</p>
      <button on:click={() => showRegistrationModal = true}>
        Register App
      </button>
    </div>
  {:else}
    <div class="apps-list">
      {#each myApps as app}
        <div class="app-card" on:click={() => selectedApp = app}>
          <div class="app-header">
            <img src={app.logoUrl} alt={app.name} />
            <div>
              <h3>{app.name}</h3>
              <span class="domain">{app.domain}</span>
            </div>
            {#if app.verified}
              <VerifiedBadge />
            {/if}
          </div>
          
          <div class="app-stats">
            <div class="stat">
              <span class="value">{app.totalAuths.toLocaleString()}</span>
              <span class="label">Authentications</span>
            </div>
            <div class="stat">
              <span class="value">
                {new Date(app.createdAt * 1000).toLocaleDateString()}
              </span>
              <span class="label">Registered</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if selectedApp}
    <div class="app-details">
      <h2>Analytics for {selectedApp.name}</h2>
      
      <!-- Real-time stats -->
      <div class="live-stats">
        <div class="stat-card">
          <span class="stat-value">{selectedApp.totalAuths}</span>
          <span class="stat-label">Total Auths</span>
        </div>
        <!-- More stats -->
      </div>

      <!-- Integration instructions -->
      <div class="integration-guide">
        <h3>Quick Integration</h3>
        <pre><code>{`<script src="https://cdn.veiled.sh/veiled.js"></script>
<script>
  const veiled = new VeiledAuth({
    network: 'mainnet',
    appId: '${selectedApp.id}'
  });
</script>`}</code></pre>
      </div>

      <!-- API Keys section -->
      <div class="api-keys">
        <h3>App ID</h3>
        <code>{selectedApp.id}</code>
        <button on:click={() => copyToClipboard(selectedApp.id)}>
          Copy
        </button>
      </div>
    </div>
  {/if}
</div>
```

**Verified Badge Component:**
```svelte
<!-- lib/components/VerifiedBadge.svelte -->
<script lang="ts">
  export let tooltip = 'Verified on Solana';
  export let size: 'sm' | 'md' | 'lg' = 'md';
</script>

<span class="verified-badge {size}" title={tooltip}>
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"/>
  </svg>
  <span>Verified</span>
</span>

<style>
  .verified-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: #10b981;
    background: #d1fae5;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .verified-badge.sm svg {
    width: 14px;
    height: 14px;
  }

  .verified-badge.md svg {
    width: 16px;
    height: 16px;
  }

  .verified-badge.lg svg {
    width: 20px;
    height: 20px;
  }
</style>
```

**Build tasks:**
- [ ] Create app directory page with filtering
- [ ] Build app detail pages
- [ ] Create developer dashboard
- [ ] Add verified badge component
- [ ] Implement analytics charts
- [ ] Add search functionality
- [ ] Style with TailwindCSS
- [ ] Deploy to Vercel

**Success criteria:**
- App directory displays all registered apps
- Can filter by category
- App detail pages show stats
- Developer dashboard works
- Verified badges display correctly

### Day 17-18: Framework Wrappers (React + Svelte)

**What to build:**

```
apps/demo/
├── app/
│   ├── page.tsx              # Landing
│   ├── chat/
│   │   └── page.tsx          # NFT-gated chat
│   └── layout.tsx
├── components/
│   ├── AuthButton.tsx
│   ├── ChatRoom.tsx
│   └── RequireNFT.tsx
└── lib/
    └── veiled-client.ts
```

**Demo concept: NFT-Gated Chat**
- Prove you own Okay Bear NFT
- Join private chat room
- Chat doesn't know which Okay Bear you own
- Different rooms can't link your identity

**Build tasks:**
- [ ] Build chat UI (SvelteKit + TailwindCSS)
- [ ] Implement NFT gating with Veiled
- [ ] Add real-time messaging (WebSocket)
- [ ] Style with shadcn/ui components
- [ ] Deploy to Vercel

### Day 19-20: Documentation Sprint

**What to document:**
- [ ] README with compelling demo GIF
- [ ] Architecture diagram (visual)
- [ ] Integration guide
- [ ] API reference
- [ ] Circuit explanation
- [ ] Video walkthrough script

### Day 21: Week 3 Testing

- [ ] End-to-end testing
- [ ] Demo rehearsal
- [ ] Performance verification
- [ ] Mobile testing

---

## Week 4: DNS Verification + Submission (Feb 11-17)

**Goal:** DNS verification, verified badges, perfect submission

### Day 22-23: DNS Verification System

### Day 22-23: DNS Verification System

**What to build:**

**DNS Verification (Let's Encrypt style):**

```typescript
// packages/sdk/src/verification/dns.ts
import * as dns from 'dns/promises';

export class DNSVerification {
  /**
   * Generate verification challenge for domain
   */
  static async generateChallenge(domain: string): Promise<Challenge> {
    const nonce = crypto.randomBytes(32).toString('hex');
    const token = `veiled-verification=${nonce}`;
    
    return {
      token,
      domain,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      instructions: `
Add this TXT record to ${domain}:

Name: _veiled-challenge.${domain}
Type: TXT
Value: ${token}

Then run: veiled-cli verify ${domain}
      `.trim()
    };
  }

  /**
   * Verify domain ownership via DNS TXT record
   */
  static async verify(domain: string, expectedToken: string): Promise<VerificationProof> {
    try {
      // Query TXT records for _veiled-challenge subdomain
      const records = await dns.resolveTxt(`_veiled-challenge.${domain}`);
      
      // Flatten array of arrays
      const flatRecords = records.flat();
      
      // Check if expected token exists
      const found = flatRecords.some(record => record === expectedToken);
      
      if (!found) {
        throw new Error('Verification token not found in DNS records');
      }
      
      // Generate signed proof (using Solana keypair)
      const proof = await this.signVerification(domain);
      
      return {
        domain,
        verifiedAt: Date.now(),
        method: 'dns',
        proof,
      };
    } catch (error) {
      throw new Error(`DNS verification failed: ${error.message}`);
    }
  }

  /**
   * Check if domain is already verified
   */
  static async checkVerification(domain: string): Promise<boolean> {
    try {
      const records = await dns.resolveTxt(`_veiled.${domain}`);
      return records.flat().some(r => r.startsWith('veiled-verified='));
    } catch {
      return false;
    }
  }

  private static async signVerification(domain: string): Promise<string> {
    // Sign domain with server keypair
    // This creates a verifiable proof that we checked DNS
    const message = Buffer.from(`veiled:${domain}:${Date.now()}`);
    // ... signing logic
    return signature.toString('base64');
  }
}
```

**CLI Integration:**
```typescript
// packages/cli/src/commands/verify.ts
import { Command } from 'commander';
import { DNSVerification } from '@veiled/sdk';

const program = new Command();

program
  .command('verify-start <domain>')
  .description('Start DNS verification process')
  .action(async (domain) => {
    const challenge = await DNSVerification.generateChallenge(domain);
    
    console.log('DNS Verification Challenge Generated\n');
    console.log(challenge.instructions);
    console.log(`\nExpires: ${new Date(challenge.expiresAt).toLocaleString()}`);
    
    // Save challenge to local file
    fs.writeFileSync(
      `.veiled-challenge-${domain}.json`,
      JSON.stringify(challenge, null, 2)
    );
  });

program
  .command('verify-check <domain>')
  .description('Check DNS verification')
  .action(async (domain) => {
    // Load saved challenge
    const challengeFile = `.veiled-challenge-${domain}.json`;
    if (!fs.existsSync(challengeFile)) {
      console.error('No challenge found. Run: veiled verify-start <domain>');
      return;
    }
    
    const challenge = JSON.parse(fs.readFileSync(challengeFile, 'utf-8'));
    
    if (Date.now() > challenge.expiresAt) {
      console.error('Challenge expired. Generate a new one.');
      return;
    }
    
    console.log('Checking DNS records...\n');
    
    try {
      const proof = await DNSVerification.verify(domain, challenge.token);
      
      console.log('✅ Domain verified successfully!');
      console.log(`Domain: ${proof.domain}`);
      console.log(`Method: ${proof.method}`);
      console.log(`Verified at: ${new Date(proof.verifiedAt).toLocaleString()}`);
      
      // Save proof
      fs.writeFileSync(
        `.veiled-proof-${domain}.json`,
        JSON.stringify(proof, null, 2)
      );
      
      console.log(`\nProof saved to: .veiled-proof-${domain}.json`);
      console.log('Use this proof when registering your app on-chain.');
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      console.log('\nTroubleshooting:');
      console.log('1. Ensure DNS record is added correctly');
      console.log('2. Wait a few minutes for DNS propagation');
      console.log('3. Check with: dig TXT _veiled-challenge.' + domain);
    }
  });
```

**Anchor Program Integration:**
```rust
// Add DNS verification proof to app registration
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DNSVerificationProof {
    pub signature: [u8; 64],
    pub timestamp: i64,
}

pub fn handle_register_app_with_dns(
    ctx: Context<RegisterApp>,
    domain: String,
    name: String,
    dns_proof: Option<DNSVerificationProof>,
    // ... other params
) -> Result<()> {
    let app = &mut ctx.accounts.app_account;
    
    // ... existing registration logic ...
    
    // Mark as DNS verified if proof provided
    if let Some(proof) = dns_proof {
        // Verify signature
        let message = format!("veiled:{}:{}", domain, proof.timestamp);
        let is_valid = verify_signature(&proof.signature, &message);
        
        require!(is_valid, ErrorCode::InvalidDNSProof);
        require!(
            proof.timestamp > Clock::get()?.unix_timestamp - 86400, // Within 24h
            ErrorCode::ExpiredDNSProof
        );
        
        app.dns_verified = true;
    }
    
    Ok(())
}
```

**SDK Integration:**
```typescript
// packages/sdk/src/veiled.ts
export class Veiled extends EventEmitter {
  async signIn(options: SignInOptions): Promise<SignInResult> {
    // ... existing logic ...
    
    // If app has DNS verification, show badge
    if (options.appId) {
      const app = await this.apps.getApp(options.appId);
      if (app?.dnsVerified) {
        this.modal?.showVerifiedBadge('DNS verified domain');
      }
    }
    
    // ... rest of flow
  }
}
```

**Verification Badge Tiers:**
```typescript
type VerificationLevel = 
  | 'none'          // No verification (⚠️ warning)
  | 'dns'           // DNS verified (✅ green check)
  | 'onchain'       // Registered on-chain (✅ blue check)
  | 'manual'        // Manually reviewed by Veiled (✅ gold check)

interface AppVerification {
  level: VerificationLevel;
  dnsVerified: boolean;
  onchainRegistered: boolean;
  manuallyReviewed: boolean;
  verifiedAt: number;
}
```

**Visual Badge System:**
```svelte
<!-- lib/components/VerifiedBadge.svelte -->
<script lang="ts">
  export let verification: AppVerification;
  
  $: badgeColor = 
    verification.manuallyReviewed ? 'gold' :
    verification.onchainRegistered ? 'blue' :
    verification.dnsVerified ? 'green' : 'gray';
  
  $: badgeText =
    verification.manuallyReviewed ? 'Verified by Veiled' :
    verification.onchainRegistered ? 'Verified on Solana' :
    verification.dnsVerified ? 'Domain Verified' : 'Unverified';
</script>

<span class="badge badge-{badgeColor}">
  {#if verification.level !== 'none'}
    <svg class="check-icon">...</svg>
  {:else}
    <svg class="warning-icon">...</svg>
  {/if}
  {badgeText}
</span>

<style>
  .badge-gold {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
  }
  
  .badge-blue {
    background: #3b82f6;
    color: white;
  }
  
  .badge-green {
    background: #10b981;
    color: white;
  }
  
  .badge-gray {
    background: #6b7280;
    color: white;
  }
</style>
```

**Build tasks:**
- [ ] Implement DNS verification system
- [ ] Add CLI commands for verification
- [ ] Update Anchor program for DNS proofs
- [ ] Create verification badge tiers
- [ ] Add badge display in modal
- [ ] Update app directory to show badges
- [ ] Write documentation
- [ ] Test DNS verification flow

**Success criteria:**
- DNS verification works end-to-end
- Badges display correctly by tier
- CLI tool is user-friendly
- Documentation is clear

### Day 24-25: Multi-Bounty Optimization & Presentation
- [ ] Showcase enhanced APIs prominently
- [ ] Add WebSocket demo
- [ ] Document Helius-specific features
- [ ] Create 1-min Helius demo video

**Quicknode bounty optimization:**
- [ ] Ensure open-source (MIT license)
- [ ] Perfect README
- [ ] Add Quicknode to supported providers
- [ ] Document multi-RPC setup

**Aztec/Noir bounty optimization:**
- [ ] Document why Noir over circom
- [ ] Showcase circuit design
- [ ] Explain non-financial use case
- [ ] Add circuit visualization

**Range bounty optimization:**
- [ ] Integrate Range SDK
- [ ] Add selective disclosure examples
- [ ] Document compliance features

### Day 24-25: Presentation Materials

**Build tasks:**
- [ ] Create pitch deck (10 slides max)
- [ ] Record demo video (2-4 minutes, SCRIPTED)
- [ ] Write submission description
- [ ] Create demo GIFs
- [ ] Design social media graphics

**Demo video script:**
```
[0:00-0:30] Problem
[0:30-1:00] Solution
[1:00-2:00] Live demo (NFT-gated chat)
[2:00-2:30] Impact
[2:30-2:45] Technical highlights
[2:45-3:00] Call to action
```

### Day 26-27: Final Polish

- [ ] Code review
- [ ] Security audit (basic)
- [ ] Performance final check
- [ ] Documentation proofread
- [ ] Test on fresh machine
- [ ] Deploy to production

### Day 28: Submission Day (Feb 17)

**Submission checklist:**
- [ ] GitHub repo public
- [ ] README perfect
- [ ] Demo deployed and working
- [ ] Video uploaded
- [ ] All bounty requirements met
- [ ] Tagged with all relevant bounties
- [ ] Submitted before deadline

---

## Critical Path Items

**Must-haves for submission:**
1. ✅ Working Noir circuit
2. ✅ Deployed Anchor program
3. ✅ Functional SDK
4. ✅ Demo application
5. ✅ Professional presentation
6. ✅ All bounty requirements met

**Nice-to-haves:**
- Svelte integration
- Mobile support
- Advanced circuits (balance, NFT)
- Comprehensive tests

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Noir learning curve | High | Start Day 1, allocate 2 days |
| Groth16 complexity | High | Week 1 MVP without it, add Week 2 |
| Proof too slow | Medium | Optimize Week 2, cap at 10s acceptable |
| RPC rate limits | Medium | Use Helius/Quicknode from start |
| Demo breaks | High | Test daily, have backup recording |

---

## Daily Time Allocation

**Total available:** 8-12 hours/day × 28 days = 224-336 hours

**Breakdown:**
- Coding: 60% (135-200 hours)
- Testing: 15% (34-50 hours)
- Documentation: 15% (34-50 hours)
- Presentation: 10% (22-34 hours)

**This follows the 20% presentation rule from Superteam podcast**

---

## Success Metrics

**Technical:**
- [ ] Proof generation: <5 seconds
- [ ] On-chain cost: <$0.01 per auth
- [ ] Circuit: <1000 constraints
- [ ] SDK: <100KB bundle size

**Submission:**
- [ ] README: >1000 stars potential
- [ ] Demo: Actually works during judging
- [ ] Video: <4 minutes, professional
- [ ] Code quality: Clean, commented, tested

**Bounties:**
- [ ] Track 02: Meets all requirements
- [ ] Helius: Uses enhanced APIs
- [ ] Quicknode: Open source, documented
- [ ] Aztec: Uses Noir, creative
- [ ] Range: Selective disclosure

---

**Next Steps:**
1. Read RESEARCH.md for learning resources
2. Start Day 1 tasks
3. Track progress daily
4. Adjust plan as needed

**Remember:** Better to have fewer features working perfectly than many features working poorly. Judges value polish and completeness.
