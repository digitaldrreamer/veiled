# Veiled Project Specifications

Complete specification and planning documents for building Veiled - Privacy-Preserving OAuth for Solana.

## What This Is

These documents define **WHAT to build** and **WHY**, not HOW to use what's built.

They are:
- ✅ Build specifications
- ✅ Feature requirements
- ✅ Technical justifications
- ✅ Strategic planning

They are NOT:
- ❌ API documentation
- ❌ Usage guides
- ❌ Tutorial content
- ❌ User manuals

## Reading Order

**Start Here (Essential):**
1. `01_PROJECT_OVERVIEW.md` - Understand the project (15 min)
2. `02_TECHNICAL_ARCHITECTURE.md` - System design (30 min)
3. `03_CORE_FEATURES.md` - Feature requirements (20 min)

**Then Read (Important):**
4. `04_BUILD_ROADMAP.md` - Week-by-week tasks (30 min)
5. `05_BOUNTY_REQUIREMENTS.md` - How to win prizes (20 min)

**Reference When Needed:**
6. `06_TECHNOLOGY_DECISIONS.md` - Why these tech choices (15 min)

**Total Reading Time: ~2 hours**

## Quick Start

If you only have 30 minutes:

1. Read `01_PROJECT_OVERVIEW.md` → Understand the vision
2. Skim `04_BUILD_ROADMAP.md` → See Week 1 tasks
3. Start building

Read the rest as you go.

## Document Structure

### 01_PROJECT_OVERVIEW.md

**Purpose:** High-level WHAT and WHY

**Covers:**
- Problem statement (Web3 auth worse than Web2)
- Solution overview (ZK-proof auth)
- Gap analysis (nothing like this exists)
- Hackathon alignment (perfect fit for Track 02)
- Success criteria

**Read when:** Starting the project

### 02_TECHNICAL_ARCHITECTURE.md

**Purpose:** System design and components

**Covers:**
- 4 major components (circuits, program, SDK, demo)
- Data flow diagrams
- Security architecture
- Performance requirements
- Testing strategy
- Deployment plan

**Read when:** Planning implementation

### 03_CORE_FEATURES.md

**Purpose:** What features to build and why

**Covers:**
- Feature prioritization (must/should/nice/won't have)
- 7 core features with justifications
- Success criteria per feature
- Features NOT to build (scope control)

**Read when:** Deciding what to implement

### 04_BUILD_ROADMAP.md

**Purpose:** Week-by-week execution plan

**Covers:**
- 4-week sprint breakdown
- Daily task lists
- Deliverables per phase
- Buffer days
- Risk mitigation
- Critical path

**Read when:** Starting each week

### 05_BOUNTY_REQUIREMENTS.md

**Purpose:** How to win specific prizes

**Covers:**
- Track 02: Privacy Tooling ($15k)
- Helius bounty ($5k)
- Quicknode bounty ($3k)
- Aztec/Noir bounty ($2.5k-$10k)
- Range bounty ($1.5k)
- Multi-bounty stacking strategy

**Read when:** Week 4 (submission prep)

### 06_TECHNOLOGY_DECISIONS.md

**Purpose:** Justification for tech stack

**Covers:**
- Noir vs Circom
- Anchor vs Native
- TypeScript vs Rust
- SvelteKit vs Next.js
- Every major technology choice
- Trade-offs and risks

**Read when:** Questioning a technology choice

## How to Use These Specs

### As Solo Developer

**Week 1:**
- Read 01-03 (understand project)
- Follow 04 Week 1 tasks
- Reference 06 when stuck on tech choice

**Week 2:**
- Review 04 Week 2 tasks
- Reference 02 for architecture details
- Check 03 for feature requirements

**Week 3:**
- Review 04 Week 3 tasks
- Start thinking about 05 (bounty strategy)
- Reference 02 for SDK design

**Week 4:**
- Follow 04 Week 4 polish tasks
- Deep dive into 05 (submissions)
- Final check against 01 (did we meet goals?)

### As Team (if applicable)

**Divide & Conquer:**
- Person A: Circuits (02 Component 1, 03 Features 1-4)
- Person B: On-chain (02 Component 2, 04 Week 2)
- Person C: SDK + Demo (02 Components 3-4, 04 Week 3)

**Sync Points:**
- End of Week 1: Verify circuits work
- End of Week 2: Integration test
- End of Week 3: Full demo working
- Week 4: Everyone on polish + presentation

### For Decision Making

**When Deciding Features:**
→ Check 03_CORE_FEATURES.md priority matrix
→ "Is this must-have, should-have, or nice-to-have?"

**When Choosing Technology:**
→ Check 06_TECHNOLOGY_DECISIONS.md
→ "Why did we choose X over Y?"

**When Running Out of Time:**
→ Check 04_BUILD_ROADMAP.md risk mitigation
→ "What can we cut while still submitting?"

**When Writing Submissions:**
→ Check 05_BOUNTY_REQUIREMENTS.md
→ "What does this specific bounty want to see?"

## Key Insights from Specs

### Strategic Insights

1. **No Direct Competition**
   - Payment privacy exists
   - Standard auth exists
   - Privacy auth for Solana does NOT exist
   - We're filling a gap, not competing

2. **Multi-Bounty Strategy**
   - One project, 5 bounty angles
   - Expected value: $9.5k-$32k
   - Strategic tech choices (Noir, Helius, Quicknode)

3. **Developer-First Positioning**
   - Not "privacy app for users"
   - Is "privacy tooling for developers"
   - Track 02 wants developer tools

### Technical Insights

1. **Simplicity is Strategic**
   - On-chain = database (no backend needed)
   - ZK for auth only (not transactions)
   - 3-line SDK API (OAuth-like)

2. **Solana-Specific Advantages**
   - Fast proof verification (400ms blocks)
   - Cheap storage (<$0.01 per user)
   - Wallet ecosystem ready (Phantom, Backpack)

3. **Scope Control**
   - Must have: Wallet ownership proof
   - Should have: NFT + balance proofs
   - Nice to have: Framework integrations
   - Won't have: Mobile, tokens, governance

### Execution Insights

1. **20% Rule for Presentation**
   - 32 hours (20% of 160) on presentation
   - Demo video MUST be scripted
   - Pitch deck quality matters

2. **Critical Path**
   - Week 1 circuits → Week 2 program → Week 3 SDK
   - Cannot skip ahead
   - Buffer days essential

3. **Minimum Viable Submission**
   - Working wallet ownership proof
   - Deployed to devnet
   - One demo
   - Demo video
   - This wins nothing, but enables winning

## What These Specs Enable

### For Planning

✅ Know exactly what to build
✅ Understand why each component exists
✅ Prioritize ruthlessly (must vs nice-to-have)
✅ Estimate time accurately

### For Building

✅ Clear architecture to follow
✅ Technology decisions justified
✅ Integration points defined
✅ Success criteria per feature

### For Submitting

✅ Bounty alignment mapped
✅ Presentation strategy defined
✅ Demo script ready
✅ Pitch deck outline done

### For Winning

✅ Novel idea validated
✅ Technical execution planned
✅ Presentation prioritized (20%)
✅ Multi-bounty strategy optimized

## Common Questions

**Q: Do I need to follow these specs exactly?**
A: No. They're a starting point. Adapt as you learn.

**Q: What if I run out of time?**
A: See 04_BUILD_ROADMAP.md "Risk Mitigation" section.
Cut nice-to-haves, keep must-haves, still submit.

**Q: What if technology doesn't work?**
A: See 06_TECHNOLOGY_DECISIONS.md for each choice.
Fallback options documented.

**Q: What if I want to add features?**
A: Check 03_CORE_FEATURES.md "Won't Have" section first.
Ask: Does this help win? If no, skip it.

**Q: When should I read which document?**
A: See "Reading Order" and "How to Use" sections above.

**Q: Can I skip any documents?**
A: Don't skip 01-04. Can skim 05 until Week 4. Can reference 06 as needed.

## Document Metadata

**Version:** 1.0
**Created:** January 2026
**For:** Solana Privacy Hack (Jan-Feb 2026)
**Author:** Solo developer (you)
**Status:** Specification complete, ready to build

## Next Steps

1. ✅ Read `01_PROJECT_OVERVIEW.md`
2. ✅ Read `02_TECHNICAL_ARCHITECTURE.md`
3. ✅ Read `03_CORE_FEATURES.md`
4. ✅ Start `04_BUILD_ROADMAP.md` Week 1 Day 1
5. 🚀 Begin building

---

**Remember:** These specs define WHAT and WHY. The building defines HOW.

Good luck! 🎯
