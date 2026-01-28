# Veiled Development: Quick Reference Guide
## Fast Links & Common Tasks for Building Privacy-First Authentication

---

## 🎯 ONE-LINE INSTALLATION COMMANDS

### Noir
```bash
curl -L https://install.noir-lang.org | bash && source ~/.bashrc && noirup
```

### Anchor
```bash
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

### Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### SvelteKit Project
```bash
npm create svelte@latest my_app && cd my_app && npm install
```

### Web3 Dependencies
```bash
npm install @solana/web3.js @solana/wallet-adapter-base @solana/wallet-adapter-react @solana/wallet-adapter-wallets @helius-labs/sdk
```

### Noir + Proof Generation
```bash
npm install @noir-lang/noir_js @noir-lang/backend_barretenberg @noir-lang/noir_wasm
```

---

## 📚 OFFICIAL DOCUMENTATION LINKS

### Noir Ecosystem
| Resource | Link |
|----------|------|
| Official Site | https://noir-lang.org |
| Documentation | https://noir-lang.org/docs |
| GitHub | https://github.com/noir-lang/noir |
| Examples | https://github.com/noir-lang/noir-examples |
| Discord | https://discord.gg/aztec |

### Anchor & Solana
| Resource | Link |
|----------|------|
| Anchor | https://book.anchor-lang.com |
| Solana Docs | https://docs.solana.com |
| Cookbook | https://solanacookbook.com |
| RPC API | https://docs.solana.com/api/http |
| Explorer | https://explorer.solana.com |

### RPC Providers
| Provider | Link |
|----------|------|
| Helius Docs | https://docs.helius.dev |
| Helius Dashboard | https://dashboard.helius.dev |
| Quicknode | https://www.quicknode.com/docs/solana |
| Quicknode Dashboard | https://app.quicknode.com |

### Frontend
| Resource | Link |
|----------|------|
| SvelteKit | https://kit.svelte.dev |
| Svelte | https://svelte.dev |
| Wallet Adapter | https://github.com/solana-labs/wallet-adapter |
| Tailwind | https://tailwindcss.com |

---

## ⚙️ ENVIRONMENT CONFIGURATION

### .env.local (Development)
```bash
VITE_HELIUS_API_KEY=your_helius_api_key_here
VITE_QUICKNODE_RPC=https://xxx.solana-devnet.quiknode.pro/xxx/
VITE_PROGRAM_ID=your_devnet_program_id
VITE_NETWORK=devnet
```

### .env.production (Mainnet)
```bash
VITE_HELIUS_API_KEY=your_helius_api_key_here
VITE_QUICKNODE_RPC=https://xxx.solana-mainnet.quiknode.pro/xxx/
VITE_PROGRAM_ID=your_mainnet_program_id
VITE_NETWORK=mainnet-beta
```

### Nargo.toml (Noir Project)
```toml
[project]
name = "veiled_auth"
type = "bin"
authors = ["Your Name"]
compiler_version = "0.31.0"
```

### Anchor.toml
```toml
[toolchain]
solana_version = "1.18.0"

[test]
cmd = "yarn test"
```

---

## 💻 ESSENTIAL CODE TEMPLATES

### Basic Noir Circuit
```noir
// src/main.nr - Simple authentication circuit
fn main(secret: Field, public_hash: pub Field) {
    let computed = std::hash::poseidon::bn254::hash_1([secret]);
    assert(computed == public_hash);
}
```

### Noir Nullifier Circuit
```noir
use dep::std::hash::poseidon::bn254::hash_3;

fn generate_nullifier(
    wallet: Field,
    domain: Field,
    secret: [u8; 32],
) -> pub Field {
    hash_3([wallet, domain, field_from_bytes(secret)])
}
```

### Basic Anchor Program
```rust
use anchor_lang::prelude::*;

declare_id!("YOUR_PROGRAM_ID_HERE");

#[program]
pub mod veiled {
    use super::*;
    
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

### Anchor Account Storage
```rust
#[account]
pub struct Nullifier {
    pub hash: [u8; 32],
    pub used: bool,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct RecordNullifier<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 1 + 8,
        seeds = [b"nullifier", nullifier.as_ref()],
        bump
    )]
    pub nullifier: Account<'info, Nullifier>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

### SvelteKit Wallet Connection
```svelte
<script lang="ts">
  import { useConnection, useWallet } from '@solana/wallet-adapter-svelte';
  import { onMount } from 'svelte';
  
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  
  let balance = 0;
  
  onMount(async () => {
    if ($publicKey) {
      const lamports = await connection.getBalance($publicKey);
      balance = lamports / 1e9;
    }
  });
</script>

{#if $connected}
  <p>Connected! Balance: {balance} SOL</p>
{:else}
  <p>Connect your wallet</p>
{/if}
```

### Proof Generation in Browser
```typescript
import { Noir } from '@noir-lang/noir_js';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import circuitArtifact from './circuit';

async function generateProof(inputs: object) {
    const backend = new BarretenbergBackend();
    const noir = new Noir(circuitArtifact);
    
    const witness = await noir.generateWitness(inputs);
    const { proof, publicInputs } = await noir.generateProof(witness);
    
    return { proof, publicInputs };
}
```

### Helius NFT Verification
```typescript
import { Helius } from '@helius-labs/sdk';

const helius = new Helius(process.env.VITE_HELIUS_API_KEY);

async function getNFTsByOwner(wallet: string) {
    const assets = await helius.rpc.getAssetsByOwner({
        ownerAddress: wallet,
        limit: 1000,
    });
    return assets.items;
}
```

---

## 🧪 TESTING & BUILD COMMANDS

### Noir
```bash
nargo compile               # Compile circuit
nargo prove                 # Generate proof
nargo verify                # Verify proof
nargo test                  # Run tests
nargo compile --include-keys # Include verification key
```

### Anchor
```bash
anchor build                # Build program
anchor test                 # Run tests locally
anchor deploy               # Deploy to network
anchor deploy --provider.cluster devnet  # Deploy to devnet
solana logs                 # View program logs
```

### SvelteKit
```bash
npm run dev                 # Development server
npm run build               # Production build
npm run preview             # Preview build
npm run test                # Unit tests
npm run test:e2e            # E2E tests
```

### Solana CLI
```bash
solana airdrop 2 --url devnet           # Get devnet SOL
solana config set --url devnet          # Set cluster
solana account YOUR_PUBKEY              # Check account
solana program show TARGET/DEPLOY/*.so  # Check program size
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Noir Circuit
```bash
cd noir_project
nargo compile --include-keys
# Check: target/verification_key.json exists
```

### Step 2: Anchor Program
```bash
cd anchor_project
anchor build
solana airdrop 2 --url devnet
anchor deploy --provider.cluster devnet
# Output: Program deployed to [PROGRAM_ID]
```

### Step 3: Frontend
```bash
cd frontend
npm run build
# Output: .svelte-kit/build/
vercel deploy  # or netlify deploy
```

---

## ⚡ PERFORMANCE TARGETS

| Component | Target | Status |
|-----------|--------|--------|
| Proof generation | <5 seconds | |
| Proof verification | <100ms | |
| On-chain verify CU | <200,000 | |
| Frontend load | <3 seconds | |
| NFT lookup | <2 seconds | |

---

## 🐛 COMMON TROUBLESHOOTING

### Noir: "Constraint overflow"
**Fix:** Break circuit into smaller functions, optimize operations

### Noir: "Type mismatch"
**Fix:** Use `field_from_bytes()` or `bytes_from_field()` for conversions

### Anchor: "Insufficient funds"
**Fix:** `solana airdrop 2 --url devnet` to get more SOL

### Anchor: "Account not rent-exempt"
**Fix:** Increase account size or check rent calculation

### Frontend: "Proof generation takes too long"
**Fix:** Use Web Workers, reduce circuit complexity

### RPC: "Rate limit exceeded"
**Fix:** Implement batching, add fallback provider, or upgrade tier

---

## 📊 KEY METRICS

### Groth16 Proof System
- Proof size: ~256 bytes
- Verification: <100ms
- Soundness: Computational
- Zero-knowledge: Perfect

### Poseidon Hash
- Constraints: ~50 per hash
- Speed: <1ms per hash
- Security: 128-bit

### Solana Program
- Max size: 12 MB
- Max account size: 10 MB
- Compute units (block): 600 million
- Compute units (instruction): 1.4 million

---

## 🔗 USEFUL TOOLS

### Development
- **Rust Playground**: https://play.rust-lang.org
- **Solana Playground**: https://beta.solpg.io
- **SvelteKit REPL**: https://svelte.dev/repl

### Blockchain
- **Solana Explorer**: https://explorer.solana.com
- **Transaction Decoder**: https://www.solana.fm/tools/tx-decoder
- **Solana Beach**: https://www.solanabeach.io

### APIs
- **Helius Dashboard**: https://dashboard.helius.dev
- **Quicknode Dashboard**: https://app.quicknode.com

---

## 📞 GET HELP

### For Noir
- Issues: https://github.com/noir-lang/noir/issues
- Discord: https://discord.gg/aztec
- Docs: https://noir-lang.org/docs

### For Anchor
- Issues: https://github.com/coral-xyz/anchor/issues
- Discord: https://discord.gg/anchorlang
- Docs: https://book.anchor-lang.com

### For Solana
- StackExchange: https://solana.stackexchange.com
- Discord: https://discord.gg/solana
- Cookbook: https://solanacookbook.com

### For Helius
- Discord: https://discord.gg/helius
- Email: support@helius.dev
- Docs: https://docs.helius.dev

---

## 📋 PROJECT CHECKLIST

### Pre-Development
- [ ] Read all 5 LLM.TXT files (index: veiled_docs_index.md)
- [ ] Set up development environment
- [ ] Create GitHub repository
- [ ] Set up local network (solana-test-validator)

### Week 1: Noir Circuits
- [ ] Create Noir project
- [ ] Write authentication circuit
- [ ] Verify proof generation <5s
- [ ] Test with various inputs

### Week 2: Anchor Program
- [ ] Create Anchor project
- [ ] Write Groth16 verification
- [ ] Test on devnet
- [ ] Implement nullifier storage

### Week 3: RPC Integration
- [ ] Set up Helius account
- [ ] Get API key
- [ ] Implement NFT verification
- [ ] Add fallback to Quicknode

### Week 4: Frontend
- [ ] Create SvelteKit project
- [ ] Connect wallet
- [ ] Integrate proof generation
- [ ] Build UI components

### Week 5: Integration & Testing
- [ ] End-to-end testing
- [ ] Security review
- [ ] Performance optimization
- [ ] Deploy to devnet

### Pre-Mainnet
- [ ] Security audit
- [ ] Mainnet testing
- [ ] Update documentation
- [ ] Prepare bounty submissions

---

## 🎯 BOUNTY SUBMISSION CHECKLIST

### Track 02: Privacy Tooling
- [ ] Documentation complete
- [ ] Example code working
- [ ] Open source license
- [ ] README explains benefits

### Helius ($5k)
- [ ] Use Helius RPC
- [ ] Use enhanced APIs
- [ ] Document integration
- [ ] Show in demo

### Quicknode ($3k)
- [ ] Support Quicknode
- [ ] Easy provider switching
- [ ] MIT license
- [ ] Documentation

### Aztec/Noir ($10k)
- [ ] Circuits in Noir
- [ ] Well-documented
- [ ] Novel use case
- [ ] Non-financial focus

### Range ($1.5k)
- [ ] Selective disclosure
- [ ] Privacy-preserving
- [ ] Compliance-aware
- [ ] Documented

---

## 🎓 LEARNING RESOURCES

- **ZK Whiteboard Sessions**: https://www.youtube.com/playlist?list=PLcPzhzreTe2i9Y1FhLfKWc4RvTv6iMhJx
- **zkIntro**: https://zkintro.com
- **Groth16 Paper**: https://eprint.iacr.org/2016/260.pdf
- **Poseidon Paper**: https://eprint.iacr.org/2019/458.pdf

---

**Quick Reference Generated**: January 21, 2026  
**For**: Veiled Privacy Authentication on Solana  
**Status**: Ready to Use