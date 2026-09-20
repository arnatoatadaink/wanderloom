# Wanderloom WBS / Critical Path Update — 2026-09-18

## 1. Status

Design phase checkpoint reached. The project moves from design into implementation specification.

Implementation update (2026-09-18): A-001 / W0-001 / CP-01 completed locally.
Workspace install, typecheck, test command, and build succeeded. The test
runner currently discovers zero tests; behavioral coverage is pending.
See [A-001 validation](A-001_VALIDATION_2026-09-18.md) for environment and scope.

A-002 tooling validation is now complete locally: pinned tool versions,
installation, typecheck, three workspace smoke tests, and build pass.
See [A-002 validation](A-002_VALIDATION_2026-09-18.md). The lint portion of
W0-002 remains pending.


Batch B domain contracts (B-001 through B-005) are complete and locally
validated. This fixes the shared domain and snapshot contract boundary required
by CP-02 and CP-03.

C-001 / W2-011 / CP-04 is complete on `feat/c-001-d1-migration`.
The migration was applied successfully with Wrangler local D1 on WSL2; all five
tables, three explicit indexes, and required constraints were verified. See
[C-001 D1 migration implementation](C-001_D1_MIGRATION_2026-09-20.md).
C-002 / W2-012 / CP-05 repository-interface implementation is complete on `feat/c-002-repository-interfaces`. The interfaces remain storage-agnostic and are defined against the fixed Batch B domain contracts; D1 implementation details stay in the Worker layer. WSL validation passed for workspace typecheck, tests, builds, and `git diff --check`. CP-05 is closed. See [C-002 repository interfaces](C-002_REPOSITORY_INTERFACES_2026-09-20.md). E-001 / W1-002 / CP-06 exploration-state-machine implementation is complete on `feat/e-001-exploration-state-machine`. WSL validation passed for workspace typecheck, tests, builds, and `git diff --check`; CP-06 is closed. See [E-001 exploration state machine](E-001_EXPLORATION_STATE_MACHINE_2026-09-20.md). The next critical-path target is CP-07: start exploration persistence.

## 2. Reflected design decisions

The WBS/CP now assumes:

- Mobile-first semi-idle RPG
- Solo-first M1
- Cloudflare Workers + D1
- Vanilla TypeScript + Vite frontend
- pnpm monorepo
- `packages/game-core` as pure domain logic
- Guest-first identity
- Future OIDC account linking
- No direct storage of passwords/card credentials
- First revenue source: advertising
- Billing/MoR deferred
- Hybrid D1 snapshot architecture
- Long-term archive primarily in Google Drive `appDataFolder`
- D1 recent archive retained only as a short 1–5 record buffer initially
- Atomic mutation design: D1 batch + mutation guard + state_version + claim nonce
- AI, Party, Caravan, payment, rewarded ads excluded from M1

## 3. Workstreams

### W0 Project Foundation
- W0-001 Workspace initialization — complete (local validation)
- W0-002 TypeScript / lint / test baseline
- W0-003 Documentation structure
- W0-004 ADR baseline

### W1 Game Core
- W1-001 Domain types
- W1-002 Exploration state machine — complete
- W1-003 Risk/reward interfaces
- W1-004 Seeded resolution
- W1-005 Failure/drop-loss model
- W1-006 Growth model

### W2 Data / Persistence
- W2-001 Player identity root
- W2-002 Core snapshot schema
- W2-003 Inventory snapshot schema
- W2-004 Recent archive schema
- W2-005 Snapshot versioning
- W2-006 Snapshot size metrics
- W2-007 Optimistic locking
- W2-008 Mutation guard
- W2-009 Atomic Level-2 mutation
- W2-010 Atomic Level-3 claim mutation
- W2-011 D1 migrations — complete
- W2-012 Repository interfaces — complete

### W3 Backend API
- W3-001 `/api/health`
- W3-002 guest player bootstrap
- W3-003 state read
- W3-004 zone read
- W3-005 expedition start
- W3-006 expedition current state
- W3-007 expedition claim
- W3-008 inventory read
- W3-009 equipment mutation
- W3-010 API error contract

### W4 Frontend
- W4-001 mobile shell
- W4-002 destination card
- W4-003 metrics panel
- W4-004 duration selector
- W4-005 exploration state screen
- W4-006 result screen
- W4-007 inventory/equipment minimum
- W4-008 compact number formatting
- W4-009 low-bandwidth asset measurement

### W5 Validation
- W5-001 unit tests for game-core
- W5-002 snapshot serialization tests
- W5-003 optimistic-lock conflict tests
- W5-004 double-claim tests
- W5-005 worker/D1 integration tests
- W5-006 playable-loop test
- W5-007 balance simulation harness
- W5-008 payload / snapshot-size metrics

### X1 Future Storage
- X1-001 Google `appDataFolder` integration
- X1-002 archive export
- X1-003 retry/sync
- X1-004 archive compaction
- X1-005 retention evaluation

### X2 Future Monetization
- X2-001 standard ads
- X2-002 ad metrics
- X2-003 rewarded ads
- X2-004 billing/MoR
- X2-005 entitlement
- X2-006 premium currency
- X2-007 AI monetization

## 4. Critical Path

```text
CP-01 Workspace initialized
↓
CP-02 Domain types fixed — complete
↓
CP-03 Snapshot types fixed — complete
↓
CP-04 D1 schema + migration — complete
↓
CP-05 Repository interfaces — complete
↓
CP-06 Exploration state machine — complete
↓
CP-07 Start exploration persistence
↓
CP-08 Claim calculation
↓
CP-09 Atomic Level-3 claim mutation
↓
CP-10 Guest bootstrap + API wiring
↓
CP-11 Mobile pre/exploring/result UI integration
↓
CP-12 Playable loop test
↓
CP-13 Balance/payload validation
↓
M1 Playable Solo Prototype
```

## 5. CP blockers

### Hard blockers
- Domain/snapshot type mismatch
- Atomic claim not proven
- double claim possible

### Non-blockers
- exact rarity percentages
- 1/3/5 archive retention choice
- Google AppDataFolder implementation
- ad provider selection
- OIDC provider selection
- Party/Caravan design details

## 6. M1 Definition of Done

A new guest player can:
1. load the game
2. view zones
3. select duration
4. see risk/reward preview
5. start an expedition
6. return after the server-authoritative end time
7. claim exactly once
8. receive Gold/EXP/drop
9. equip a drop
10. repeat the loop

Additionally:
- duplicate claim does not duplicate rewards
- concurrent equipment/claim operations do not overwrite each other
- snapshot sizes are measured
- frontend payload size is measured
- game-core remains independent from Workers/D1/DOM
