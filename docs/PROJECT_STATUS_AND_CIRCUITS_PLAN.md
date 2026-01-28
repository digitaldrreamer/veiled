# Project Status & Circuits Plan (Jan 27, 2026)

## Current state
- Solana program (`veiled`) is production-ready: Ed25519 validation, domain-scoped nullifiers, PDA seeds fixed, replay protection confirmed.
- Memory and encoding optimizations complete; 7/7 integration tests passing.
- Anchor/ts-mocha tooling stable with `anchor.workspace` pattern; dev environment issues (GLIBC, permissions, faucet) resolved.

## Network stance
- Deploy and demo on **devnet** for the hackathon (free SOL, fast iteration, same UX); mainnet can follow post-audit.

## Next work (2–3 weeks)
- **Noir circuits (3)**: wallet ownership, balance range (selective disclosure), NFT ownership.
- **SDK**: circuit selection, proof generation, submission to existing Solana program, return session.
- **Demo app**: side-by-side traditional vs veiled auth; showcase all three proof modes.
- **Integrations**: Helius/Quicknode for balance/NFT data; optional basic on-chain app registry.
- **Polish & submission**: docs/quickstart, pitch deck, demo video, devnet live link.

## Why all three circuits fit now
- All share the same on-chain path: submit `proof`, `public_inputs`, `nullifier`; program verifies + enforces replay protection.
- No additional on-chain changes needed—only circuit and client work.

## High-level timeline
- Week 2: Circuits (3) + SDK wiring + RPC hooks.
- Week 3: Demo experience + external dev integrations + app registry (light).
- Week 4: Polish, docs, deck, demo video, submission.

## Bounty alignment
- Privacy tooling: strong fit (ZK + nullifiers, dev-friendly integration).
- Helius/Quicknode: RPC usage for balance/NFT queries.
- Noir/Aztec: 3 circuits, auth-focused, well documented.
- Range: balance-range selective disclosure circuit.

## Proof/test status snapshot
- All ed25519/nullifier tests: **7/7 passing** on devnet-targeted build.

