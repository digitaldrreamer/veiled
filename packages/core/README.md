# @veiled/core

TypeScript SDK for Veiled - Privacy-preserving authentication for Solana.

## Installation

```bash
bun add @veiled/core
# or
npm install @veiled/core
```

## Quick Start

```typescript
import { VeiledAuth } from '@veiled/core';

const veiled = new VeiledAuth({
  rpcProvider: 'helius',
  apiKey: process.env.HELIUS_API_KEY,
});

// Sign in with wallet ownership proof
const result = await veiled.signIn({
  requirements: { wallet: true },
  domain: window.location.hostname
});

console.log('Nullifier:', result.nullifier);
```

## API Reference

### VeiledAuth

Main class for Veiled authentication.

#### Constructor

```typescript
new VeiledAuth(config: VeiledConfig)
```

**Config Options:**
- `rpcProvider`: `'helius' | 'quicknode' | 'custom'`
- `apiKey?`: RPC API key (optional for public endpoints)
- `rpcUrl?`: Custom RPC URL (if provider is 'custom')
- `programId?`: Veiled program ID (defaults to mainnet program)

#### Methods

##### `signIn(options: SignInOptions): Promise<AuthResult>`

Generate a ZK proof and authenticate.

**Options:**
```typescript
{
  requirements: {
    wallet: boolean,              // Always true
    nft?: {
      collection: PublicKey,     // NFT collection to prove ownership
    },
    balance?: {
      minimum: number,            // Minimum balance in lamports
      token?: PublicKey,          // Token mint (undefined = SOL)
    }
  },
  domain: string,                // Domain for nullifier scoping
  expiry?: number,               // Session expiry in seconds (default: 86400)
}
```

**Returns:**
```typescript
{
  success: boolean,
  nullifier: string,              // Unique per wallet+domain
  proof: string,                  // Hex-encoded proof
  commitment: string,             // Public commitment
  txSignature?: string,           // Transaction signature if submitted
}
```

##### `verifySession(nullifier: string): Promise<SessionStatus>`

Verify if a session is still valid.

**Returns:**
```typescript
{
  valid: boolean,
  expiresAt?: number,
  domain?: string,
}
```

##### `signOut(nullifier: string): Promise<void>`

Expire a session (sign out).

## Examples

### Basic Wallet Authentication

```typescript
const veiled = new VeiledAuth({ rpcProvider: 'helius' });

const result = await veiled.signIn({
  requirements: { wallet: true },
  domain: 'myapp.com'
});

// Store nullifier for session management
localStorage.setItem('veiled_nullifier', result.nullifier);
```

### NFT-Gated Access

```typescript
const veiled = new VeiledAuth({ rpcProvider: 'helius' });

const result = await veiled.signIn({
  requirements: {
    wallet: true,
    nft: {
      collection: new PublicKey('DeGodsCollectionAddress')
    }
  },
  domain: 'myapp.com'
});

if (result.success) {
  // User owns an NFT from the collection
  // But we don't know which one!
}
```

### Balance Range Proof

```typescript
const veiled = new VeiledAuth({ rpcProvider: 'helius' });

const result = await veiled.signIn({
  requirements: {
    wallet: true,
    balance: {
      minimum: 1_000_000_000, // 1 SOL
      // token: undefined means SOL
    }
  },
  domain: 'myapp.com'
});

if (result.success) {
  // User has at least 1 SOL
  // But we don't know the exact amount!
}
```

## Project Structure

```
packages/core/
├── src/
│   ├── veiled-auth.ts      # Main VeiledAuth class
│   ├── proof/
│   │   └── generator.ts    # ZK proof generation
│   ├── solana/
│   │   └── program.ts       # Solana program interaction
│   └── ...
├── scripts/                 # Utility scripts
└── ...
```

## Development

### Setup

```bash
# Install dependencies
bun install

# Build
bun run build

# Test
bun test
```

### Building

```bash
# Build TypeScript
bun run build

# Watch mode
bun run build --watch
```

## Requirements

- Node.js 18+ or Bun 1.2+
- Solana wallet (Phantom, Backpack, Solflare)
- RPC provider (Helius, Quicknode, or custom)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires Web Workers for proof generation.

## Learn More

- [Main README](../../README.md)
- [Circuit Documentation](../circuit/README.md)
- [Anchor Program](../anchor/README.md)
