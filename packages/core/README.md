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

// Production: Use Helius Secure URL (no API key needed!)
const veiled = new VeiledAuth({
  chain: 'solana',
  rpcProvider: 'helius',
  rpcUrl: 'https://your-secure-helius-url.helius-rpc.com'
  // Get URL from: dashboard.helius.dev → RPCs → Secure RPC
});

// Sign in with wallet ownership proof
const session = await veiled.signIn({
  requirements: { wallet: true },
  domain: window.location.hostname
});

console.log('Authenticated:', session.nullifier);
```

**✨ That's it!** No API keys, no backend needed, production-ready.

**For advanced security:** See [Production Deployment](#production-deployment) section in main README for Quicknode JWT setup.

## API Reference

### VeiledAuth

Main class for Veiled authentication.

#### Constructor

```typescript
new VeiledAuth(config: VeiledConfig)
```

**Config Options:**
- `chain`: `'solana'` (required, currently only Solana is supported)
- `rpcProvider`: `'helius' | 'quicknode' | 'custom'` (required)
- `rpcUrl?`: Primary RPC URL (takes precedence over rpcProvider)
  - For Helius: Use Secure URL format (e.g., `https://abc-456-fast-devnet.helius-rpc.com`)
  - Safe to expose in frontend (no API key needed, IP rate-limited at 5 TPS)
  - For Quicknode: Use your endpoint URL
- `heliusApiKey?`: Helius API key (only needed if not using Secure URL)
- `quicknodeEndpoint?`: Quicknode endpoint URL (required for NFT ownership circuit)
- `quicknodeApiKey?`: Quicknode API key (optional)
- `programId?`: Veiled program ID (defaults to mainnet program)
- `wallet?`: Optional wallet adapter (can be set later with `setWalletAdapter()`)

#### Methods

##### `signIn(options: SignInOptions): Promise<AuthResult>`

Generate a ZK proof and authenticate.

**Options:**
```typescript
{
  requirements: {
    wallet: true,                // Always required
    nft?: {
      collection: string,        // NFT collection address (requires Quicknode)
    },
    balance?: {
      minimum: number,          // Minimum balance in lamports
      token?: string,            // Token mint address (⏳ Coming in v2 - currently only SOL supported)
    }
  },
  domain: string,                // Domain for nullifier scoping
  permissions?: {                // Optional: Request additional permissions
    permissions: Permission[],   // Array of permission types
    reason?: string,             // Why permissions are needed
    duration?: number,           // Duration in seconds (default: 3600)
  },
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
  verified: boolean,               // Whether proof was verified on-chain
  permissions: Permission[],       // Granted permissions (if any)
  expiresAt: number,               // Session expiry timestamp
  balanceRangeBucket?: number,     // Balance range bucket (0-3) when using balance_range circuit
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
const veiled = new VeiledAuth({
  chain: 'solana',
  rpcProvider: 'helius',
  rpcUrl: 'https://your-secure-helius-url.helius-rpc.com'
});

const result = await veiled.signIn({
  requirements: { wallet: true },
  domain: 'myapp.com'
});

// Store nullifier for session management
localStorage.setItem('veiled_nullifier', result.nullifier);
```

### NFT-Gated Access

```typescript
// Note: NFT ownership circuit requires Quicknode endpoint
const veiled = new VeiledAuth({
  chain: 'solana',
  rpcProvider: 'quicknode',
  quicknodeEndpoint: 'https://your-quicknode-endpoint.solana-mainnet.quiknode.pro/...'
});

const result = await veiled.signIn({
  requirements: {
    wallet: true,
    nft: {
      collection: 'DeGodsCollectionAddress' // Collection address as string
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
const veiled = new VeiledAuth({
  chain: 'solana',
  rpcProvider: 'helius',
  rpcUrl: 'https://your-secure-helius-url.helius-rpc.com'
});

const result = await veiled.signIn({
  requirements: {
    wallet: true,
    balance: {
      minimum: 1_000_000_000, // 1 SOL in lamports
      // token: undefined means SOL (currently only SOL is supported)
      // ⏳ Token balance proofs (USDC, etc.) - Coming in v2
    }
  },
  domain: 'myapp.com'
});

if (result.success) {
  // User has at least 1 SOL
  // But we don't know the exact amount!
  // Balance range bucket (0-3) indicates approximate range
  console.log('Balance range bucket:', result.balanceRangeBucket);
}
```

### Permission System

```typescript
// Default: Maximum privacy (only nullifier revealed)
const session = await veiled.signIn({
  requirements: { wallet: true },
  domain: 'myapp.com'
});
// App sees: Only nullifier ✅

// Optional: Request specific permissions
const session = await veiled.signIn({
  requirements: { wallet: true },
  domain: 'myapp.com',
  permissions: {
    permissions: ['reveal_wallet_address'],
    reason: 'To display your profile',
    duration: 3600 // 1 hour
  }
});
// User sees privacy warning and can approve/deny
// If denied, app still works with just nullifier!

// Available permissions:
// - reveal_wallet_address (HIGH risk)
// - reveal_exact_balance (MEDIUM risk)
// - reveal_token_balances (MEDIUM risk)
// - reveal_nft_list (MEDIUM risk)
// - reveal_transaction_history (HIGH risk)
// - reveal_staking_positions (MEDIUM risk)
// - reveal_defi_positions (MEDIUM risk)
// - sign_transactions (CRITICAL risk)
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

## Production Deployment

### Recommended: Helius Secure URLs

For production apps, use Helius Secure URLs (no API key needed):

```typescript
const veiled = new VeiledAuth({
  chain: 'solana',
  rpcProvider: 'helius',
  rpcUrl: 'https://your-secure-helius-url.helius-rpc.com'
  // ✅ Safe to expose in frontend
  // ✅ IP rate-limited (5 TPS)
  // ✅ Get from: dashboard.helius.dev → RPCs → Secure RPC
});
```

### Advanced: Quicknode JWT

For high-security production apps, use Quicknode JWT authentication:

```typescript
// Backend generates JWT
const token = await fetch('/api/get-token').then(r => r.json());

const veiled = new VeiledAuth({
  chain: 'solana',
  rpcProvider: 'quicknode',
  rpcUrl: 'https://your-quicknode-endpoint',
  connectionConfig: {
    fetch: async (url, init) => {
      const headers = new Headers(init?.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      return fetch(url, { ...init, headers });
    }
  }
});
```

### ⚠️ Security Best Practices

❌ **Never expose raw API keys in frontend:**
```typescript
// DON'T DO THIS:
heliusApiKey: 'your-api-key-here' // ❌ Exposed to users!
```

✅ **Use secure methods:**
- Helius → Secure URLs (no key needed)
- Quicknode → JWT (key stays on backend)
- Custom → Backend proxy

See main [README.md](../../README.md#production-deployment) for full deployment guide.

## Requirements

- Node.js 18+ or Bun 1.2+
- Solana wallet (Phantom, Backpack, Solflare)
- RPC provider (Helius Secure URL recommended, or Quicknode JWT)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Requires Web Workers for proof generation.

## Learn More

- [Main README](../../README.md)
- [Circuit Documentation](../circuit/README.md)
- [Anchor Program](../anchor/README.md)
