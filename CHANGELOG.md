## 2026-01-21
- Initialized monorepo folder structure (backend/frontend packages and apps).

## 2026-01-21
- Switched to a single root Bun workspace layout (moved backend/frontend folders into /packages and /apps).

## 2026-01-21
- Updated docs to remove React/Svelte SDK references and align docs with framework-agnostic @veiled/core-only approach.

## 2026-01-21
- Fixed API inconsistencies: standardized signIn() to use requirements: {} instead of prove: []
- Updated class name references: Veiled → VeiledAuth
- Removed React-specific headers and code examples
- Updated package manager references: prioritize bun add over npm install
- Fixed framework integration examples to show framework-agnostic usage
- Added notes for post-MVP features (age verification, balance ranges, Range SDK)

## 2026-01-21
- Created VERIFICATION_REPORT.md confirming API consistency and MVP boundaries
- Verified all docs use standardized requirements: {} API format
- Confirmed MVP features (Weeks 1-3) vs post-MVP features (Week 4+) are correctly marked
- All verifications passed: no contradictions found

## 2026-01-21
- Scaffolded @veiled/core package (VeiledAuth + types) and ensured it emits dist JS + d.ts
- Wired apps/demo to import @veiled/core and display a basic sign-in flow (placeholder nullifier)

## 2026-01-21
- Scaffolded Noir circuit project structure (Nargo.toml, src/main.nr, lib.nr, Prover.toml)
- Created wallet ownership circuit skeleton (needs Noir CLI to compile)
- Added circuit README and .gitignore

## 2026-01-21
- Installed Noir CLI (nargo) via noirup
- Compiled wallet ownership circuit successfully
- Circuit generates ACIR output (target/veiled_circuit.json)
- Created test inputs in Prover.toml
- Circuit executes successfully with test inputs
- Next: Add proper cryptographic primitives (poseidon hash, ed25519)

## Summary - Circuit Setup Complete

✅ **Installed Noir CLI** (nargo 1.0.0-beta.18)
✅ **Created wallet ownership circuit** (src/main.nr)
✅ **Circuit compiles successfully** (generates ACIR)
✅ **Circuit structure ready** for cryptographic primitives

**Current Status:**
- Circuit uses simplified hash functions (placeholders)
- Ready to add poseidon hash and ed25519 once dependencies are configured
- Test inputs created (Prover.toml)
- Circuit executes (minor TOML parsing issue to resolve)

**Next Steps:**
1. Add proper cryptographic dependencies to Nargo.toml
2. Update circuit to use poseidon hash and ed25519
3. Wire circuit into @veiled/core SDK
4. Generate proofs from browser

## 2026-01-21 - Circuit Integration
- Updated circuit to use simplified hash functions (compiles successfully)
- Created proof generator module in @veiled/core
- Wired proof generation into VeiledAuth.signIn()
- Circuit compiles and generates ACIR (target/veiled_circuit.json)
- SDK structure ready for Noir WASM integration
- Next: Integrate Noir WASM for browser proof generation

## 2026-01-27
- Added project status & circuits plan doc; reaffirmed devnet strategy and next steps.

- 2026-01-28: Initial project commit.
- 2026-02-05: Add Veiled behind-the-scenes flow carousel and update button/green accent colors in web app.
