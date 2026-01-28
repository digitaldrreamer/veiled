# Project Structure

**Complete directory and file organization for Veiled**

---

## Repository Root

```
veiled/
├── packages/                    # Monorepo packages
│   ├── circuit/                # Noir ZK circuits
│   ├── anchor/                 # Solana programs
│   ├── core/                   # @veiled/core SDK
│   └── cli/                    # Developer CLI tools
├── apps/
│   ├── web/                    # Landing page
│   ├── demo/                   # Demo application
│   └── docs/                   # Documentation site
├── docs/                       # Documentation markdown files
├── .github/                    # GitHub configuration
├── package.json                # Root package.json (workspaces)
├── bun.lockb                   # Bun lockfile
├── .gitignore
├── LICENSE
└── README.md
```

---

## Package: Circuit

**Location:** `packages/circuit/`

**Purpose:** Noir zero-knowledge circuits

```
packages/circuit/
├── src/
│   ├── main.nr                 # Wallet ownership circuit
│   ├── balance_range.nr        # Balance proof circuit
│   ├── nft_ownership.nr        # NFT proof circuit
│   ├── lib.nr                  # Shared utilities
│   └── constants.nr            # Circuit constants
├── tests/
│   ├── wallet_ownership.nr     # Circuit tests
│   ├── balance_range.nr
│   └── nft_ownership.nr
├── Nargo.toml                  # Noir configuration
├── Prover.toml                 # Prover inputs template
└── README.md                   # Circuit documentation
```

**Key Files to Create:**

### `src/main.nr`
```noir
// Wallet ownership proof circuit
use dep::std;

fn main(
    wallet_secret_key: [u8; 32],
    random_secret: Field,
    wallet_pubkey_hash: pub Field,
    domain_hash: pub Field,
    nullifier: pub Field,
    timestamp: pub u64,
) {
    // Implementation (see CIRCUIT_DESIGN.md)
}
```

### `Nargo.toml`
```toml
[package]
name = "veiled_circuit"
type = "bin"
authors = ["Veiled Team"]
compiler_version = ">=0.23.0"

[dependencies]
```

---

## Package: Anchor

**Location:** `packages/anchor/`

**Purpose:** Solana proof verification program

```
packages/anchor/
├── programs/veiled/
│   ├── src/
│   │   ├── lib.rs              # Main program entry
│   │   ├── instructions/
│   │   │   ├── mod.rs
│   │   │   ├── verify_auth.rs  # Verify ZK proof
│   │   │   └── init_nullifier.rs
│   │   ├── state/
│   │   │   ├── mod.rs
│   │   │   ├── nullifier.rs    # Nullifier account
│   │   │   └── config.rs       # Program config
│   │   ├── errors.rs           # Error codes
│   │   └── constants.rs        # Program constants
│   ├── Cargo.toml
│   └── Xargo.toml
├── tests/
│   ├── veiled.ts               # Integration tests
│   └── utils.ts                # Test utilities
├── migrations/
│   └── deploy.ts               # Deployment script
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Workspace Cargo.toml
└── README.md
```

**Key Files to Create:**

### `programs/veiled/src/lib.rs`
```rust
use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqSGobuGUfnmenKc4VSwtr8P");

#[program]
pub mod veiled {
    use super::*;
    
    pub fn verify_auth(
        ctx: Context<VerifyAuth>,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        nullifier: [u8; 32],
    ) -> Result<()> {
        // Implementation
        Ok(())
    }
}
```

### `Anchor.toml`
```toml
[features]
seeds = false
skip-lint = false

[programs.devnet]
veiled = "Fg6PaFpoGXkYsidMpWxTWqSGobuGUfnmenKc4VSwtr8P"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

---

## Package: Core

**Location:** `packages/core/`

**Purpose:** Main TypeScript SDK

```
packages/core/
├── src/
│   ├── index.ts                # Main exports
│   ├── veiled.ts               # Veiled class
│   ├── types/
│   │   ├── index.ts            # Type exports
│   │   ├── config.ts           # Configuration types
│   │   ├── auth.ts             # Auth types
│   │   └── proof.ts            # Proof types
│   ├── proof/
│   │   ├── index.ts
│   │   ├── generator.ts        # Proof generation
│   │   ├── circuit-loader.ts   # Load Noir WASM
│   │   └── verifier.ts         # Proof verification
│   ├── solana/
│   │   ├── index.ts
│   │   ├── program.ts          # Anchor program interface
│   │   ├── rpc.ts              # RPC helpers
│   │   └── constants.ts        # Solana constants
│   ├── utils/
│   │   ├── index.ts
│   │   ├── hash.ts             # Hashing utilities
│   │   ├── encoding.ts         # Encoding helpers
│   │   └── errors.ts           # Error classes
│   └── constants.ts            # Global constants
├── tests/
│   ├── veiled.test.ts
│   ├── proof.test.ts
│   ├── solana.test.ts
│   └── utils.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

**Key Files to Create:**

### `src/veiled.ts`
```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { ProofGenerator } from './proof/generator';

export class VeiledAuth {
  private connection: Connection;
  private program: Program;
  private proofGenerator: ProofGenerator;

  constructor(config: VeiledConfig) {
    // Implementation
  }

  async signIn(options: SignInOptions): Promise<SignInResult> {
    // Implementation
  }
}
```

### `package.json`
```json
{
  "name": "@veiled/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "bun test"
  },
  "dependencies": {
    "@coral-xyz/anchor": "^0.32.1",
    "@solana/web3.js": "^1.91.0",
    "@solana/wallet-adapter-base": "^0.9.23",
    "bs58": "^5.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Package: CLI

**Location:** `packages/cli/`

**Purpose:** Developer CLI tooling (e.g., register/verify helpers)

```
packages/cli/
├── src/
│   ├── index.ts
│   └── commands/
├── package.json
└── README.md
```

---

## App: Web (Landing Page)

**Location:** `apps/web/`

**Purpose:** Landing page and marketing site

```
apps/web/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte      # Root layout
│   │   ├── +page.svelte        # Home page
│   │   ├── docs/
│   │   │   └── +page.svelte    # Docs overview
│   │   └── about/
│   │       └── +page.svelte
│   ├── lib/
│   │   └── components/
│   │       ├── Hero.svelte
│   │       ├── Features.svelte
│   │       ├── CodeExample.svelte
│   │       └── Footer.svelte
│   ├── app.html
│   └── app.css
├── static/
│   ├── favicon.png
│   ├── logo.svg
│   └── images/
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── README.md
```

---

## App: Demo

**Location:** `apps/demo/`

**Purpose:** NFT-gated chat demo

```
apps/demo/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte        # Landing
│   │   ├── chat/
│   │   │   ├── +layout.svelte
│   │   │   ├── +page.svelte    # Chat room
│   │   │   └── +server.ts      # WebSocket server
│   │   └── api/
│   │       └── auth/
│   │           └── +server.ts  # Auth API
│   ├── lib/
│   │   ├── veiled-client.ts    # Veiled instance
│   │   ├── stores/
│   │   │   ├── auth.ts
│   │   │   └── chat.ts
│   │   └── components/
│   │       ├── AuthButton.svelte
│   │       ├── ChatRoom.svelte
│   │       ├── ChatMessage.svelte
│   │       ├── RequireNFT.svelte
│   │       └── WalletButton.svelte
│   ├── app.html
│   └── app.css
├── static/
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── README.md
```

**Key Files:**

### `src/routes/chat/+page.svelte`
```svelte
<script lang="ts">
  import { veiled, isAuthenticated } from '$lib/stores/auth';
  import ChatRoom from '$lib/components/ChatRoom.svelte';
  import RequireNFT from '$lib/components/RequireNFT.svelte';
  
  async function handleAuth() {
    await veiled.signIn({
      requirements: {
        wallet: true,
        nft: { collection: OKAY_BEARS_COLLECTION }
      },
      domain: window.location.hostname
    });
  }
</script>

<RequireNFT collection="okay_bears">
  <ChatRoom />
</RequireNFT>
```

---

## Documentation

**Location:** `docs/`

**Purpose:** Markdown documentation

```
docs/
├── README.md                   # Documentation index
├── DEVELOPMENT_PLAN.md         # Build timeline ✅
├── RESEARCH.md                 # Learning resources ✅
├── ARCHITECTURE.md             # System design ✅
├── CIRCUIT_DESIGN.md           # ZK circuits ✅
├── TECH_STACK.md               # Technologies ✅
├── BOUNTY_CHECKLIST.md         # Bounty requirements ✅
├── PROJECT_STRUCTURE.md        # This file ✅
├── QUICKSTART.md               # Quick start guide
├── API_REFERENCE.md            # API documentation
├── INTEGRATION_GUIDE.md        # Integration guide
├── DEPLOYMENT.md               # Deployment guide
├── TESTING.md                  # Testing strategy
├── SECURITY.md                 # Security considerations
└── FAQ.md                      # Frequently asked questions
```

---

## GitHub Configuration

**Location:** `.github/`

```
.github/
├── workflows/
│   ├── ci.yml                  # CI/CD pipeline
│   ├── deploy.yml              # Deployment
│   └── test.yml                # Test runner
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
├── PULL_REQUEST_TEMPLATE.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── FUNDING.yml
```

**Key Files:**

### `.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
      
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build
```

---

## Root Files

### `package.json` (Root)
```json
{
  "name": "veiled",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "bun run --filter './packages/*' build",
    "test": "bun test",
    "dev": "bun run --filter './apps/demo' dev",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "typescript": "^5.3.0"
  }
}
```

### `.gitignore`
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
target/
.anchor/
.svelte-kit/

# Environment
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Temporary
.cache/
.temp/

# Vercel
.vercel

# Noir
proofs/
Prover.toml
Verifier.toml
```

### `LICENSE`
```
MIT License

Copyright (c) 2026 Veiled

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### `README.md` (Root)
See the comprehensive README already created.

---

## Environment Files

### `.env.example`
```bash
# Solana Network
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# RPC Providers
HELIUS_API_KEY=your_helius_key_here
NEXT_PUBLIC_HELIUS_RPC=https://devnet.helius-rpc.com/?api-key=your_key
QUICKNODE_RPC_URL=https://your-endpoint.solana-devnet.quiknode.pro/YOUR_KEY/
RPC_PROVIDER=helius

# Veiled Program
NEXT_PUBLIC_VEILED_PROGRAM_ID=Fg6PaFpoGXkYsidMpWxTWqSGobuGUfnmenKc4VSwtr8P

# Circuit CDN
NEXT_PUBLIC_CIRCUIT_CDN=https://cdn.veiled.sh/circuits

# Range Compliance (Optional)
RANGE_API_KEY=your_range_key_here

# Development
NODE_ENV=development
```

---

## Creation Order

**Week 1: Foundation**
1. Create repository structure
2. Initialize packages (circuit, anchor, core)
3. Set up build tools (bun, anchor, noir)
4. Create basic README
5. Set up .gitignore

**Week 2: Core Development**
1. Implement circuits (src/main.nr)
2. Build Anchor program (lib.rs)
3. Create SDK skeleton (veiled.ts)
4. Add tests

**Week 3: Frontend & Demo**
1. Set up SvelteKit apps
2. Create React/Svelte packages
3. Build demo components
4. Integrate everything

**Week 4: Documentation & Polish**
1. Complete all documentation
2. Add examples
3. Polish README
4. Record demo videos

---

## File Count Estimate

```
Total Files: ~150-200

Breakdown:
- Circuit: 10 files
- Anchor: 20 files
- Core SDK: 30 files
- React: 15 files
- Svelte: 15 files
- Demo App: 40 files
- Landing: 30 files
- Docs: 20 files
- Config: 20 files
```

---

## Quick Start Commands

```bash
# Initialize repository
mkdir veiled && cd veiled
git init
bun init

# Create package structure
mkdir -p packages/{circuit,anchor,core,react,svelte}
mkdir -p apps/{web,demo,docs}
mkdir -p docs

# Initialize each package
cd packages/circuit && nargo init
cd ../anchor && anchor init veiled
cd ../core && bun init
# ... etc

# Install root dependencies
cd ../../
bun install

# Start development
bun run dev
```

---

**Next Steps:**
1. Start with repository initialization
2. Follow DEVELOPMENT_PLAN.md for build order
3. Reference TECH_STACK.md for configurations
4. Use RESEARCH.md for learning resources
