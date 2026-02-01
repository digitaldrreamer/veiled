# Veiled Demo App

NFT-gated chat demo application showcasing Veiled's privacy-preserving authentication.

## Overview

This demo application demonstrates how Veiled enables NFT-gated access without revealing which specific NFT a user owns. Users can join chat rooms by proving they own an NFT from a collection, while their wallet address remains hidden.

## Features

- **NFT-Gated Access**: Prove NFT ownership without revealing which NFT
- **Private Authentication**: Wallet address never exposed to the chat
- **Real-Time Chat**: WebSocket-based chat functionality
- **Visual Comparison**: Side-by-side comparison of normal auth vs Veiled

## Development

### Prerequisites

- Bun v1.2+
- Solana wallet with devnet SOL
- NFT collection on devnet (use `bun run mint-devnet-nft` to create one)

### Setup

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your RPC provider and API keys

# Start development server
bun run dev
```

The app will be available at `http://localhost:5173`

### Environment Variables

```env
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_HELIUS_API_KEY=your_helius_key_here
VITE_PROGRAM_ID=your_program_id_here
```

## Usage

1. **Connect Wallet**: Use Phantom, Backpack, or Solflare
2. **Select NFT Collection**: Choose which collection to gate access by
3. **Generate Proof**: Veiled generates a ZK proof (takes ~5 seconds)
4. **Join Chat**: If proof is valid, you can join the chat room
5. **See Privacy**: Notice that the chat only sees your nullifier, not your wallet address

## Project Structure

```
apps/demo/
├── src/
│   ├── routes/          # SvelteKit routes
│   │   ├── +page.svelte # Main demo page
│   │   └── ...
│   ├── lib/             # Shared utilities
│   └── ...
├── static/
│   ├── idl/             # Anchor program IDL
│   └── circuit/          # Compiled Noir circuits
└── ...
```

## Building

```bash
# Production build
bun run build

# Preview production build
bun run preview
```

## Deployment

The demo is configured to deploy to Vercel:

```bash
# Deploy to Vercel
vercel deploy
```

## Testing

```bash
# Run tests
bun test

# Run with coverage
bun test --coverage
```

## Troubleshooting

### "Wallet not connected"
- Ensure you have a Solana wallet extension installed
- Check that the wallet is connected to devnet

### "Proof generation failed"
- Check that the circuit is compiled: `cd packages/circuit && nargo compile`
- Ensure the circuit JSON is in `static/circuit/`
- Check browser console for errors

### "NFT not found"
- Ensure you own an NFT from the selected collection
- Use `bun run mint-devnet-nft` to create a test NFT
- Check that the collection address is correct

## Learn More

- [Main README](../../README.md)
- [Core SDK](../../packages/core/README.md)
- [Circuit Documentation](../../packages/circuit/README.md)
