# Veiled Architecture

Technical architecture and system design documentation.

---

## Overview

Veiled is a privacy-preserving authentication system for Solana that uses zero-knowledge proofs to enable wallet authentication without revealing wallet addresses or sensitive on-chain data.

### Design Principles

1. **Privacy-First**: User's wallet address never leaves their device
2. **Zero-Knowledge**: Prove statements without revealing underlying data
3. **Solana-Native**: Leverage Solana's speed and low costs
4. **Developer-Friendly**: OAuth-like API, familiar patterns
5. **Compliance-Aware**: Selective disclosure supports regulations
6. **Decentralized**: No trusted third parties required

---

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         User's Browser                       │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Wallet (e.g.  │  │   Veiled SDK │  │  ZK Proof Gen   │ │
│  │   Phantom)     │  │   (@veiled)  │  │   (Noir WASM)   │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        dApp Frontend                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Receives: ZK Proof + Nullifier (NO wallet address)   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Solana Blockchain                       │
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │  Veiled Anchor   │  │  Nullifier Registry (PDA)     │  │
│  │  Program         │  │  - Prevents double-use         │  │
│  │  - Verifies ZK   │  │  - Stores per-dApp nullifiers  │  │
│  │    proofs        │  │  - No wallet addresses stored  │  │
│  └──────────────────┘  └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      RPC Providers                           │
│  ┌──────────────────┐  ┌────────────────────────────────┐  │
│  │  Helius RPC      │  │  Quicknode RPC                 │  │
│  │  - Enhanced APIs │  │  - Standard RPC                │  │
│  │  - WebSocket     │  │  - Multi-chain support         │  │
│  └──────────────────┘  └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. ZK Circuits (Noir)

**Location**: `packages/circuit/`

**Purpose**: Generate zero-knowledge proofs of wallet ownership and eligibility

#### Circuit Types

**a) Basic Wallet Ownership Circuit**

```noir
// Proves: "I own a Solana wallet"
// Without revealing: Which wallet

circuit wallet_ownership {
  // Private inputs (never revealed)
  private_key: Field,
  
  // Public inputs (revealed to verifier)
  public_key_hash: Field,
  domain: Field,
  timestamp: Field,
  
  // Constraints
  assert(hash(private_key) == public_key_hash);
  assert(timestamp < current_time + 300); // 5 min validity
}
```

**b) Balance Range Circuit**

```noir
// Proves: "My balance > X"
// Without revealing: Exact balance

circuit balance_range {
  // Private
  actual_balance: Field,
  wallet_address: Field,
  
  // Public
  minimum_balance: Field,
  balance_range_bucket: Field, // e.g., "10k-100k"
  
  // Constraints
  assert(actual_balance >= minimum_balance);
  assert(balance_in_range(actual_balance, balance_range_bucket));
}
```

**c) NFT Ownership Circuit**

```noir
// Proves: "I own an NFT from collection X"
// Without revealing: Which specific NFT

circuit nft_ownership {
  // Private
  wallet_address: Field,
  token_mint: Field,
  merkle_proof: [Field; 32],
  
  // Public
  collection_address: Field,
  merkle_root: Field,
  
  // Constraints
  assert(verify_merkle_proof(token_mint, merkle_root, merkle_proof));
  assert(nft_belongs_to_collection(token_mint, collection_address));
}
```

#### Nullifier Generation

```noir
// Generates unique per-dApp identifier
fn generate_nullifier(
  wallet_address: Field,
  domain: Field,
  secret: Field
) -> Field {
  poseidon_hash([wallet_address, domain, secret])
}

// Properties:
// 1. Same wallet + same domain = same nullifier
// 2. Same wallet + different domain = different nullifier
// 3. Cannot reverse nullifier to get wallet address
```

---

### 2. Anchor Program (Solana)

**Location**: `packages/anchor/`

**Purpose**: On-chain proof verification and nullifier management

#### Program Structure

```rust
// programs/veiled/src/lib.rs

#[program]
pub mod veiled {
    use super::*;

    /// Verify a ZK proof and register nullifier
    pub fn verify_auth(
        ctx: Context<VerifyAuth>,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        nullifier: [u8; 32],
    ) -> Result<()> {
        // 1. Verify ZK proof
        require!(
            verify_groth16_proof(&proof, &public_inputs)?,
            ErrorCode::InvalidProof
        );

        // 2. Check nullifier not already used
        let nullifier_account = &ctx.accounts.nullifier_account;
        require!(
            !nullifier_account.used,
            ErrorCode::NullifierAlreadyUsed
        );

        // 3. Mark nullifier as used
        nullifier_account.used = true;
        nullifier_account.timestamp = Clock::get()?.unix_timestamp;
        nullifier_account.domain = ctx.accounts.domain.key();

        // 4. Emit auth event
        emit!(AuthSuccessEvent {
            nullifier,
            timestamp: Clock::get()?.unix_timestamp,
            domain: ctx.accounts.domain.key(),
        });

        Ok(())
    }

    /// Initialize a nullifier account (PDA)
    pub fn init_nullifier(
        ctx: Context<InitNullifier>,
        nullifier: [u8; 32],
    ) -> Result<()> {
        let account = &mut ctx.accounts.nullifier_account;
        account.nullifier = nullifier;
        account.used = false;
        account.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}
```

#### Account Structures

```rust
#[account]
pub struct NullifierAccount {
    pub nullifier: [u8; 32],    // Unique identifier
    pub used: bool,              // Prevents double-use
    pub timestamp: i64,          // When it was used
    pub domain: Pubkey,          // Which dApp
    pub created_at: i64,
}

// PDA derivation: ["nullifier", nullifier_bytes]
// This ensures O(1) lookups and deterministic addresses
```

#### Error Codes

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid ZK proof")]
    InvalidProof,
    
    #[msg("Nullifier already used")]
    NullifierAlreadyUsed,
    
    #[msg("Proof expired (>5 minutes old)")]
    ProofExpired,
    
    #[msg("Invalid domain")]
    InvalidDomain,
}
```

---

### 3. SDK (@veiled/core)

**Location**: `packages/core/`

**Purpose**: Abstract away ZK complexity, provide OAuth-like API

#### Core API

```typescript
// src/veiled.ts

export class VeiledAuth {
  private circuit: NoirCircuit;
  private connection: Connection;
  private program: Program;

  constructor(config: VeiledConfig) {
    this.circuit = loadCircuit(config.circuitWasm);
    this.connection = new Connection(config.rpcUrl);
    this.program = new Program(VEILED_IDL, config.programId);
  }

  /**
   * Sign in with zero-knowledge proof
   */
  async signIn(options: SignInOptions): Promise<SignInResult> {
    // 1. Connect wallet (if not connected)
    const wallet = await this.connectWallet();

    // 2. Fetch required data (balance, NFTs, etc.)
    const userData = await this.fetchUserData(wallet, options.prove);

    // 3. Generate ZK proof (client-side, private)
    const { proof, publicInputs, nullifier } = await this.generateProof({
      privateInputs: {
        walletAddress: wallet.publicKey,
        ...userData,
      },
      publicInputs: {
        domain: window.location.hostname,
        timestamp: Date.now(),
        requirements: options.prove,
      },
    });

    // 4. Submit to Solana (verify + register nullifier)
    const signature = await this.submitProof(proof, publicInputs, nullifier);

    // 5. Return session
    return {
      nullifier: bs58.encode(nullifier),
      verified: true,
      signature,
      expiresAt: Date.now() + (options.sessionDuration || 3600000),
    };
  }

  /**
   * Generate ZK proof (runs in browser)
   */
  private async generateProof(inputs: ProofInputs): Promise<Proof> {
    // Load Noir circuit (WASM)
    const circuit = await this.circuit.load();

    // Generate witness
    const witness = await circuit.generateWitness(inputs);

    // Generate proof (Groth16)
    const proof = await circuit.prove(witness);

    // Extract public outputs (nullifier)
    const nullifier = proof.publicInputs.nullifier;

    return { proof, publicInputs: proof.publicInputs, nullifier };
  }

  /**
   * Fetch user data for proof generation
   */
  private async fetchUserData(
    wallet: Wallet,
    requirements: string[]
  ): Promise<UserData> {
    const data: UserData = {};

    for (const req of requirements) {
      if (req.startsWith('balance')) {
        // Fetch SOL/token balance via RPC
        data.balance = await this.connection.getBalance(wallet.publicKey);
      } else if (req.startsWith('owns_nft')) {
        // Fetch NFTs via Helius/Quicknode
        const nfts = await this.fetchNFTs(wallet.publicKey);
        data.nfts = nfts;
      }
      // ... other requirements
    }

    return data;
  }

  /**
   * Submit proof to Solana for verification
   */
  private async submitProof(
    proof: Uint8Array,
    publicInputs: Uint8Array,
    nullifier: Uint8Array
  ): Promise<string> {
    // Derive nullifier PDA
    const [nullifierPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('nullifier'), Buffer.from(nullifier)],
      this.program.programId
    );

    // Create transaction
    const tx = await this.program.methods
      .verifyAuth(
        Array.from(proof),
        Array.from(publicInputs),
        Array.from(nullifier)
      )
      .accounts({
        nullifierAccount: nullifierPDA,
        domain: new PublicKey(/* domain identifier */),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }
}
```

#### Framework Integrations (Post-MVP)

Veiled is **framework-agnostic**. If needed later, add thin wrappers for React/Svelte/Vue that delegate to `@veiled/core`.

---

### 4. RPC Integration

#### Helius Integration

```typescript
// Enhanced APIs for NFT/token data
import { Helius } from '@helius-labs/sdk';

const helius = new Helius(process.env.HELIUS_API_KEY);

// Fetch NFTs with metadata
const nfts = await helius.rpc.getAssetsByOwner({
  ownerAddress: wallet.publicKey.toBase58(),
  page: 1,
  limit: 100,
});

// WebSocket for real-time auth events
const ws = helius.connection.onProgramAccountChange(
  VEILED_PROGRAM_ID,
  (accountInfo) => {
    console.log('New auth event:', accountInfo);
  }
);
```

#### Quicknode Integration

```typescript
// Standard RPC + fallback
const connection = new Connection(
  config.rpcProvider === 'helius'
    ? process.env.HELIUS_RPC_URL
    : process.env.QUICKNODE_RPC_URL
);
```

---

## Data Flow

### Authentication Flow (Detailed)

```
1. USER INITIATES SIGN-IN
   ↓
   User clicks "Sign in with Solana (privately)"
   
2. WALLET CONNECTION
   ↓
   dApp: const wallet = await connectWallet()
   User: Approves connection in Phantom/Backpack
   
3. DATA FETCHING (Private, Client-Side)
   ↓
   SDK: Fetches balance, NFTs via RPC
   Note: Wallet address NEVER sent to dApp server
   
4. ZK PROOF GENERATION (Browser)
   ↓
   Circuit: Generates witness from private inputs
   Circuit: Computes ZK proof (Groth16)
   Output: { proof, nullifier, publicInputs }
   
5. PROOF SUBMISSION (On-Chain)
   ↓
   SDK: Creates transaction with proof
   Anchor: Verifies proof cryptographically
   Anchor: Checks nullifier not used
   Anchor: Marks nullifier as used
   Anchor: Emits AuthSuccess event
   
6. SESSION CREATION
   ↓
   dApp: Receives nullifier (anonymous ID)
   dApp: Creates session with nullifier
   User: Authenticated without revealing wallet
```

### Nullifier Lifecycle

```
Generation:
  nullifier = hash(wallet_address + domain + secret)

Registration (First Use):
  1. Derive PDA: ["nullifier", nullifier_bytes]
  2. Create NullifierAccount { used: true, domain, timestamp }
  3. Cost: ~0.002 SOL (one-time)

Subsequent Uses:
  1. Check PDA exists
  2. Verify not already used
  3. Error if already used (prevents double-auth)
  
Properties:
  ✓ Same wallet + same domain = same nullifier (consistent ID)
  ✓ Same wallet + different domain = different nullifier (unlinkable)
  ✓ Nullifier reveals nothing about wallet address (zero-knowledge)
```

---

## Security Model

### Threat Model

**What we protect against:**
- ✅ Wallet address exposure (even to dApp)
- ✅ Cross-site tracking (different nullifiers per domain)
- ✅ Transaction history analysis (no on-chain link to wallet)
- ✅ Replay attacks (nullifiers prevent reuse)
- ✅ Proof forgery (cryptographic soundness)

**What we DON'T protect against:**
- ⚠️ Browser fingerprinting (orthogonal concern)
- ⚠️ IP address tracking (use VPN)
- ⚠️ Wallet provider seeing your wallet (they already do)
- ⚠️ Correlation attacks (if you voluntarily link data)

### Cryptographic Assumptions

1. **Groth16 Soundness**: Cannot forge valid proofs
2. **Poseidon Hash Collision Resistance**: Nullifiers are unique
3. **Discrete Log Hardness**: Cannot reverse nullifier to wallet
4. **Circuit Correctness**: Constraints enforce intended logic

### Privacy Guarantees

**Zero-Knowledge Properties:**
- **Completeness**: Valid proofs always verify
- **Soundness**: Invalid proofs never verify
- **Zero-Knowledge**: Verifier learns nothing beyond claim

**Anonymity Properties:**
- **Unlinkability**: Cannot link nullifiers across domains
- **Untraceability**: Cannot link nullifier to wallet address
- **Forward Secrecy**: Past nullifiers don't reveal future ones

---

## Performance

### Proof Generation Time

| Circuit | Browser (WASM) | Native (Rust) |
|---------|----------------|---------------|
| Wallet Ownership | ~2-3 seconds | ~200ms |
| Balance Range | ~3-4 seconds | ~300ms |
| NFT Ownership | ~4-5 seconds | ~400ms |

**Optimization strategies:**
- Pre-compile circuits to WASM
- Cache proving keys (25MB download, one-time)
- Use Web Workers for non-blocking generation

### On-Chain Costs

| Operation | Compute Units | Cost (SOL) |
|-----------|---------------|------------|
| Verify Proof | ~50,000 CU | ~0.00001 |
| Init Nullifier | ~5,000 CU | ~0.002 (rent) |
| **Total per auth** | ~55,000 CU | **~0.002 SOL** |

**Comparison:**
- Ethereum ZK auth: $5-50 per auth
- Solana (Veiled): <$0.01 per auth
- **500x-5000x cheaper on Solana**

### Scalability

**Throughput:**
- Solana TPS: 65,000
- Veiled auth overhead: ~55,000 CU
- Theoretical max: ~1,000 auths/second

**Storage:**
- Per nullifier: 128 bytes
- 1M users: ~128 MB on-chain
- Cost: ~1,000 SOL for 1M nullifiers

---

## Deployment Architecture

### Development

```
Local:
  ├─ Solana Test Validator (localhost:8899)
  ├─ Anchor program deployed locally
  ├─ Frontend: localhost:3000
  └─ Proof generation: Browser WASM
```

### Staging (Devnet)

```
Devnet:
  ├─ Program ID: BYbF6QC9PoeHGH4y1pLNC2YHBChpnFBq46vBydyBFxq2
  ├─ Frontend: veiled-staging.vercel.app
  ├─ RPC: Helius/Quicknode devnet
  └─ Nullifier registry: Devnet accounts
```

### Production (Mainnet)

```
Mainnet:
  ├─ Program ID: [TBD after audits]
  ├─ Frontend: veiled.sh
  ├─ RPC: Helius/Quicknode mainnet
  ├─ CDN: Vercel Edge (circuit WASM)
  └─ Monitoring: [TBD]
```

---

## Future Enhancements

### Phase 2 Features

1. **Multi-Proof Batching**
   - Batch multiple auth proofs in one transaction
   - Reduce costs by 50-80%

2. **Recursive Proofs**
   - Prove "I have valid session" without regenerating
   - Enable session extensions

3. **Hardware Wallet Support**
   - Ledger/Trezor integration
   - Secure key management

4. **Decentralized Proof Generation**
   - Optional proving service (for low-end devices)
   - Still client-side, just outsourced compute

### Phase 3 (Enterprise)

1. **SSO Integration**
   - SAML support
   - Corporate identity federation

2. **Advanced Compliance**
   - AML/KYC integration
   - Regulatory reporting

3. **Multi-Chain Support**
   - Ethereum, Polygon, etc.
   - Cross-chain nullifiers

---

## References

- [Noir Documentation](https://noir-lang.org/)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
- [EIP-4361: Sign in with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [Semaphore Protocol](https://semaphore.appliedzkp.org/)

---

**Last Updated**: January 2026
