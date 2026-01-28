# Technology Stack

**Complete tech stack for Veiled with setup instructions**

---

## Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend Layer                      │
├─────────────────────────────────────────────────────────┤
│  SvelteKit + TailwindCSS + shadcn/ui                   │
│  Wallet Adapter (Phantom, Backpack, Solflare)          │
│  @veiled/core (framework-agnostic JS/TS SDK)           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                     SDK Layer                           │
├─────────────────────────────────────────────────────────┤
│  @veiled/core (TypeScript)                             │
│  Noir Circuit (WASM)                                    │
│  Anchor Client                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Blockchain Layer                       │
├─────────────────────────────────────────────────────────┤
│  Anchor Program (Rust)                                  │
│  Solana Devnet/Mainnet                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Infrastructure                         │
├─────────────────────────────────────────────────────────┤
│  Helius RPC / Quicknode RPC                            │
│  Vercel (hosting)                                       │
│  Coolify (self-hosted option)                          │
└─────────────────────────────────────────────────────────┘
```

---

## Core Technologies

### 1. Noir (ZK Circuits)

**Version:** Latest stable
**Purpose:** Generate zero-knowledge proofs
**Why Noir over circom:** Better Rust integration, simpler syntax, Aztec bounty

**Installation:**
```bash
curl -L https://install.noir-lang.org | bash
noirup
nargo --version
```

**Configuration:**
```toml
# Nargo.toml
[package]
name = "veiled_circuit"
type = "bin"
authors = [""]
compiler_version = ">=0.23.0"

[dependencies]
```

**Key Files:**
```
packages/circuit/
├── Nargo.toml
├── src/
│   ├── main.nr              # Wallet ownership circuit
│   ├── balance_range.nr     # Balance proofs
│   ├── nft_ownership.nr     # NFT proofs
│   └── lib.nr               # Shared utilities
├── Prover.toml              # Input template
└── Verifier.toml            # Verification key
```

**Build Commands:**
```bash
# Compile circuit
nargo compile

# Generate proof
nargo prove

# Verify proof
nargo verify

# Run tests
nargo test

# Check constraints
nargo info
```

**Why This Matters:**
- Aztec bounty ($10k pool) requires Noir
- Faster development than circom
- Better error messages
- Native Rust interop

---

### 2. Anchor (Solana Programs)

**Version:** 0.32.1
**Purpose:** Smart contracts for proof verification
**Language:** Rust

**Installation:**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Verify
anchor --version
```

**Configuration:**
```toml
# Anchor.toml
[features]
seeds = false
skip-lint = false

[programs.devnet]
veiled = "Fg6PaFpoGXkYsidMpWxTWqSGobuGUfnmenKc4VSwtr8P"

[programs.mainnet]
veiled = "TBD"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Devnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

**Project Structure:**
```
packages/anchor/
├── Anchor.toml
├── Cargo.toml
├── programs/veiled/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs           # Main program
│       ├── instructions/    # Instruction handlers
│       │   ├── mod.rs
│       │   ├── verify_auth.rs
│       │   └── init_nullifier.rs
│       ├── state/           # Account structures
│       │   ├── mod.rs
│       │   └── nullifier.rs
│       └── errors.rs        # Error codes
├── tests/
│   └── veiled.ts           # Integration tests
└── migrations/
    └── deploy.ts
```

**Build Commands:**
```bash
# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests
anchor test

# Verify program
anchor verify <program_id>

# View logs
solana logs
```

**Key Dependencies:**
```toml
# programs/veiled/Cargo.toml
[dependencies]
anchor-lang = "0.32.1"
anchor-spl = "0.32.1"
```

---

### 3. TypeScript SDK (@veiled/core)

**Version:** Start at 0.1.0
**Purpose:** JavaScript/TypeScript library for developers
**Build Tool:** Bun (faster than npm/yarn)

**Installation:**
```bash
curl -fsSL https://bun.sh/install | bash
bun --version
```

**Configuration:**
```json
// packages/core/package.json
{
  "name": "@veiled/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "bun test",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@coral-xyz/anchor": "^0.32.1",
    "@solana/web3.js": "^1.91.0",
    "@solana/wallet-adapter-base": "^0.9.23",
    "bs58": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "eslint": "^8.56.0"
  }
}
```

**TypeScript Configuration:**
```json
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Project Structure:**
```
packages/core/
├── src/
│   ├── index.ts             # Main exports
│   ├── veiled.ts            # Veiled class
│   ├── types/
│   │   ├── index.ts
│   │   └── config.ts
│   ├── proof/
│   │   ├── generator.ts     # Proof generation
│   │   ├── circuit-loader.ts
│   │   └── types.ts
│   ├── solana/
│   │   ├── program.ts       # Anchor integration
│   │   ├── rpc.ts          # RPC helpers
│   │   └── constants.ts
│   └── utils/
│       ├── hash.ts
│       └── errors.ts
├── tests/
│   ├── veiled.test.ts
│   └── proof.test.ts
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

**Build Commands:**
```bash
# Install dependencies
bun install

# Build package
bun run build

# Run tests
bun test

# Watch mode
bun run dev
```

---

### 4. SvelteKit (Frontend)

**Version:** Latest stable
**Purpose:** Demo app and landing page
**Why SvelteKit:** User's preferred framework, fast, modern

**Installation:**
```bash
bun create svelte@latest apps/demo
cd apps/demo
bun install
```

**Configuration:**
```javascript
// apps/demo/svelte.config.js
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $lib: './src/lib',
      $components: './src/components'
    }
  }
};

export default config;
```

**Project Structure:**
```
apps/demo/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte   # Root layout
│   │   ├── +page.svelte     # Landing page
│   │   ├── chat/
│   │   │   └── +page.svelte # NFT-gated chat
│   │   └── api/
│   │       └── auth/
│   │           └── +server.ts
│   ├── lib/
│   │   ├── veiled-client.ts # Veiled initialization
│   │   ├── stores/
│   │   │   └── auth.ts
│   │   └── components/
│   │       ├── AuthButton.svelte
│   │       ├── ChatRoom.svelte
│   │       └── RequireAuth.svelte
│   └── app.html
├── static/
│   └── favicon.png
├── svelte.config.js
└── vite.config.ts
```

**Key Dependencies:**
```json
{
  "dependencies": {
    "@veiled/core": "workspace:*",
    "@solana/wallet-adapter-base": "^0.9.23",
    "@solana/wallet-adapter-svelte": "^0.3.0",
    "@solana/wallet-adapter-wallets": "^0.19.0",
    "@solana/web3.js": "^1.91.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-vercel": "^5.0.0",
    "@sveltejs/kit": "^2.5.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "svelte": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

---

### 5. TailwindCSS + shadcn/ui

**Purpose:** Styling and UI components

**Installation:**
```bash
cd apps/demo

# Install Tailwind
bun add -D tailwindcss postcss autoprefixer
bunx tailwindcss init -p

# Install shadcn-svelte
bunx shadcn-svelte@latest init

# Add components
bunx shadcn-svelte@latest add button
bunx shadcn-svelte@latest add card
bunx shadcn-svelte@latest add dialog
```

**Configuration:**
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          // ... color palette
        }
      }
    }
  },
  plugins: []
};
```

**Global Styles:**
```css
/* src/app.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... custom properties */
  }
}
```

---

## RPC Providers

### Helius ($5k Bounty)

**Purpose:** Enhanced Solana RPC with NFT/token APIs
**Why:** Bounty requirement + better DX

**Installation:**
```bash
bun add @helius-labs/sdk
```

**Configuration:**
```typescript
// lib/helius.ts
import { Helius } from '@helius-labs/sdk';

export const helius = new Helius(process.env.HELIUS_API_KEY!);

// Enhanced NFT fetching
export async function fetchNFTs(walletAddress: string) {
  const response = await helius.rpc.getAssetsByOwner({
    ownerAddress: walletAddress,
    page: 1,
    limit: 1000,
  });
  return response.items;
}

// WebSocket subscriptions
export function subscribeToAuth(callback: (data: any) => void) {
  helius.connection.onProgramAccountChange(
    VEILED_PROGRAM_ID,
    (accountInfo, context) => {
      callback({ accountInfo, context });
    }
  );
}
```

**Environment Variables:**
```bash
# .env.local
HELIUS_API_KEY=your_key_here
NEXT_PUBLIC_HELIUS_RPC=https://devnet.helius-rpc.com/?api-key=your_key
```

### Quicknode ($3k Bounty)

**Purpose:** Alternative RPC provider
**Why:** Bounty requirement + redundancy

**Configuration:**
```typescript
// lib/rpc-provider.ts
import { Connection } from '@solana/web3.js';
import { Helius } from '@helius-labs/sdk';

export class RPCProvider {
  private connection: Connection;
  private helius?: Helius;
  
  constructor(config: {
    provider: 'helius' | 'quicknode';
    apiKey?: string;
    rpcUrl?: string;
  }) {
    if (config.provider === 'helius') {
      this.helius = new Helius(config.apiKey!);
      this.connection = this.helius.connection;
    } else {
      this.connection = new Connection(
        config.rpcUrl || 'https://api.mainnet-beta.solana.com'
      );
    }
  }
  
  // Unified interface
  async getBalance(address: PublicKey): Promise<number> {
    return await this.connection.getBalance(address);
  }
  
  async getNFTs(address: PublicKey): Promise<NFT[]> {
    if (this.helius) {
      // Use enhanced API
      return await this.helius.rpc.getAssetsByOwner({
        ownerAddress: address.toBase58()
      });
    } else {
      // Fallback to standard RPC
      return await this.fetchNFTsStandard(address);
    }
  }
}
```

**Environment Variables:**
```bash
# .env.local
QUICKNODE_RPC_URL=https://your-endpoint.solana-devnet.quiknode.pro/YOUR_KEY/
RPC_PROVIDER=helius  # or quicknode
```

---

## Deployment

### Vercel (Primary)

**Purpose:** Host demo app, landing page, docs
**Why:** Free, fast, easy

**Configuration:**
```json
// vercel.json
{
  "buildCommand": "bun run build",
  "devCommand": "bun run dev",
  "installCommand": "bun install",
  "framework": "sveltekit",
  "outputDirectory": ".svelte-kit/vercel"
}
```

**Environment Variables (Vercel Dashboard):**
```
HELIUS_API_KEY=xxx
QUICKNODE_RPC_URL=xxx
NEXT_PUBLIC_HELIUS_RPC=xxx
NEXT_PUBLIC_VEILED_PROGRAM_ID=xxx
```

**Deploy Commands:**
```bash
# Install Vercel CLI
bun add -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Coolify (Self-Hosted Option)

**Purpose:** Alternative to Vercel, self-hosted
**Why:** User preference, more control

**Setup:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  veiled:
    image: node:20
    working_dir: /app
    command: bun run preview
    ports:
      - "3000:3000"
    environment:
      - HELIUS_API_KEY=${HELIUS_API_KEY}
      - QUICKNODE_RPC_URL=${QUICKNODE_RPC_URL}
    volumes:
      - ./apps/demo:/app
```

**Coolify Configuration:**
```bash
# In Coolify dashboard
Repository: https://github.com/yourusername/veiled
Branch: main
Build Command: bun install && bun run build
Start Command: bun run preview
Port: 3000
```

---

## Development Tools

### Bun (Package Manager & Runtime)

**Why Bun over npm/yarn:**
- 3x faster install
- Built-in test runner
- Native TypeScript support
- Better monorepo support

**Commands:**
```bash
# Install dependencies
bun install

# Add package
bun add package-name
bun add -D package-name  # dev dependency

# Run script
bun run build
bun run dev
bun run test

# Execute file
bun src/index.ts
```

### Monorepo Structure (Bun Workspaces)

**Configuration:**
```json
// package.json (root)
{
  "name": "veiled",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "build": "bun run --filter './packages/*' build",
    "test": "bun test",
    "dev": "bun run --filter './apps/demo' dev"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

### Git & GitHub

**Configuration:**
```gitignore
# .gitignore
node_modules/
.env
.env.local
.vercel
dist/
target/
.anchor/
.svelte-kit/
build/
.DS_Store
*.log
```

**GitHub Actions (CI/CD):**
```yaml
# .github/workflows/ci.yml
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

## Testing Stack

### Unit Tests (Bun Test)

```typescript
// packages/core/tests/veiled.test.ts
import { expect, test, describe } from 'bun:test';
import { Veiled } from '../src/veiled';

describe('Veiled', () => {
  test('initializes correctly', () => {
    const veiled = new VeiledAuth({ network: 'devnet' });
    expect(veiled).toBeDefined();
  });
  
  test('generates nullifier', async () => {
    const veiled = new VeiledAuth({ network: 'devnet' });
    const nullifier = await veiled.generateNullifier(publicKey, 'test.com');
    expect(nullifier).toHaveLength(64);
  });
});
```

### Integration Tests (Anchor)

```typescript
// packages/anchor/tests/veiled.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Veiled } from "../target/types/veiled";

describe("veiled", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.Veiled as Program<Veiled>;
  
  it("Verifies auth", async () => {
    const tx = await program.methods
      .verifyAuth(proof, publicInputs, nullifier)
      .rpc();
    
    console.log("Transaction signature:", tx);
  });
});
```

### E2E Tests (Playwright - Optional)

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can authenticate', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=Sign in with Veiled');
  // ... wallet interaction
  await expect(page.locator('text=Welcome, anon!')).toBeVisible();
});
```

---

## Environment Variables

**Complete `.env.local` Template:**
```bash
# Solana Network
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# RPC Providers
HELIUS_API_KEY=your_helius_key
NEXT_PUBLIC_HELIUS_RPC=https://devnet.helius-rpc.com/?api-key=your_helius_key
QUICKNODE_RPC_URL=https://your-endpoint.solana-devnet.quiknode.pro/YOUR_KEY/
RPC_PROVIDER=helius  # or quicknode

# Veiled Program
NEXT_PUBLIC_VEILED_PROGRAM_ID=Fg6PaFpoGXkYsidMpWxTWqSGobuGUfnmenKc4VSwtr8P

# Circuit CDN
NEXT_PUBLIC_CIRCUIT_CDN=https://cdn.veiled.sh/circuits

# Optional: Range Compliance
RANGE_API_KEY=your_range_key
```

---

## Quick Reference

**Install Everything:**
```bash
# System dependencies
curl -L https://install.noir-lang.org | bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
curl -fsSL https://bun.sh/install | bash

# Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Project dependencies
bun install
```

**Build Everything:**
```bash
# Circuits
cd packages/circuit && nargo compile

# Anchor
cd packages/anchor && anchor build

# SDK
cd packages/core && bun run build

# Demo
cd apps/demo && bun run build
```

**Deploy Everything:**
```bash
# Deploy Anchor program
cd packages/anchor
anchor deploy --provider.cluster devnet

# Deploy frontend
cd apps/demo
vercel --prod
```

---

**Next:** Start with Day 1 tasks in DEVELOPMENT_PLAN.md
