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
C-002 / W2-012 / CP-05 repository-interface implementation is complete on `feat/c-002-repository-interfaces`. The interfaces remain storage-agnostic and are defined against the fixed Batch B domain contracts; D1 implementation details stay in the Worker layer. WSL validation passed for workspace typecheck, tests, builds, and `git diff --check`. CP-05 is closed. See [C-002 repository interfaces](C-002_REPOSITORY_INTERFACES_2026-09-20.md). E-001 / W1-002 / CP-06 exploration-state-machine implementation is complete on `feat/e-001-exploration-state-machine`. WSL validation passed for workspace typecheck, tests, builds, and `git diff --check`; CP-06 is closed. See [E-001 exploration state machine](E-001_EXPLORATION_STATE_MACHINE_2026-09-20.md). CP-07 start-exploration persistence implementation is complete on `feat/cp-07-start-exploration-persistence`. WSL validation passed after a TypeScript 7 test-only narrowing fix: workspace typecheck, tests, builds, and `git diff --check` are successful. E-002 produces the next core snapshot and the Worker persistence service commits it through a D1 compare-and-swap update. Formal C-003 serialization and W3-005 HTTP route wiring remain separate pending work. CP-07 is closed. See [CP-07 start exploration persistence](CP-07_START_EXPLORATION_PERSISTENCE_2026-09-20.md). CP-08 claim-calculation implementation is complete on `feat/cp-08-claim-calculation`. WSL validation passed for workspace typecheck, tests, builds, and `git diff --check`. The pure domain calculation applies pre-resolved EXP/Gold/drops, clears the active exploration, advances core/inventory versions, and produces a pending-sync archive entry. Exact W1-003 through W1-006 balance/resolution formulas remain separate pending work behind the `ExplorationResolution` boundary. CP-08 is closed. See [CP-08 claim calculation](CP-08_CLAIM_CALCULATION_2026-09-21.md). CP-09 Atomic Level-3 claim mutation implementation is complete on `feat/cp-09-atomic-claim-mutation`. WSL validation passed for workspace typecheck, tests, builds, and `git diff --check`. The D1 batch guards core/inventory CAS, archive insertion, recent-archive pruning, and guard release behind a claim guard acquired only when expected versions, exploration ID, and claim nonce all match. Retry classification returns `already_claimed`, observed version conflicts, or invalid exploration state. CP-09 is closed. See [CP-09 Atomic Level-3 claim mutation](CP-09_ATOMIC_LEVEL3_CLAIM_MUTATION_2026-09-21.md). CP-10 Guest bootstrap + API wiring is complete for the exploration HTTP loop on `feat/cp-10-guest-bootstrap-api-wiring`. WSL re-validation passed for workspace typecheck, tests, builds, and `git diff --check`. Health/bootstrap/state/inventory/current exploration/zones/start/claim are wired. The isolated provisional `m1-smoke` providers define one 5-minute zone-duration, deterministic 5 Gold / 10 EXP / no-drop resolution, and archive retention 3 strictly as implementation-test fixtures, not accepted balance policy. Equipment mutation remains pending behind unresolved drop-generation/equipment-slot design and is not required to close the CP-10 exploration loop. CP-10 is closed. See [CP-10 Guest bootstrap + API wiring](CP-10_GUEST_BOOTSTRAP_API_WIRING_2026-09-21.md). CP-11 Mobile pre/exploring/result UI integration is complete on `feat/cp-11-mobile-exploration-ui`. WSL validation passed for workspace typecheck, tests, builds, and `git diff --check`. A TypeScript 7 CSS side-effect import error was resolved by adding `vite/client` types to the web tsconfig. The Vanilla TypeScript mobile shell bootstraps/restores guest identity, loads zones/state, selects destination/duration, starts exploration, derives the countdown from server `endsAt`, claims rewards, and renders the result. No image/font/framework assets were added. CP-11 is closed. See [CP-11 Mobile exploration UI](CP-11_MOBILE_EXPLORATION_UI_2026-09-21.md). CP-12 Playable loop test is complete on `feat/cp-12-playable-loop-test`. WSL validation passed. The Cloudflare Vitest integration test applies the real D1 migration and exercises guest bootstrap → zone read → start → current exploration → claim → persisted reward/archive verification → duplicate-claim rejection → second start. CP-12 also fixed the HTTP retry path so an already committed claim returns `already_claimed` instead of being hidden by the cleared active-exploration state. CP-12 is closed. See [CP-12 Playable loop test](CP-12_PLAYABLE_LOOP_TEST_2026-09-21.md). CP-13 Balance / payload validation is complete on `feat/cp-13-balance-payload-validation`. WSL typecheck, tests, builds, web bundle measurement, and `git diff --check` passed. CP-13 is closed. The remaining M1 critical path has been re-sequenced as CP-14 through CP-19: reward/drop contract → seeded real-drop resolution → equipment domain/persistence/API → minimum equipment UI → claim/equipment concurrency validation → full M1 acceptance loop. CP-14 is complete on `feat/cp-14-m1-reward-drop-contract`. WSL typecheck, tests, builds, web bundle measurement, and `git diff --check` passed. CP-14 is closed. CP-15 is complete on `feat/cp-15-seeded-m1-resolution`. WSL typecheck, tests, builds, web bundle measurement, and `git diff --check` passed. CP-15 is closed. CP-16 is implementation-complete on `feat/cp-16-equipment-domain-api`; WSL validation is pending. The M1 `charm` slot, pure ownership/slot validation, inventory-only D1 CAS mutation, idempotent equip retry, stale-version rejection, and `POST /api/equipment` are implemented. Simultaneous claim/equip safety remains intentionally deferred to CP-18. See [CP-16 Equipment domain + atomic API](CP-16_EQUIPMENT_DOMAIN_ATOMIC_API_2026-09-22.md). The production claim path now resolves Gold/EXP from the exploration seed, materializes one real M1 item instance, persists it through the atomic claim, records it in the archive, and keeps duplicate claim item-safe. See [CP-15 Seeded M1 resolution with real drop](CP-15_SEEDED_M1_RESOLUTION_REAL_DROP_2026-09-22.md). Reward/drop generation boundaries, item materialization, server reward preview, and concrete web item/drop DTOs are implemented without adding D1 dependencies to game-core. See [CP-14 Reward/drop contract](CP-14_M1_REWARD_DROP_CONTRACT_2026-09-22.md) and [M1 remaining critical path](M1_REMAINING_CRITICAL_PATH_2026-09-22.md). UTF-8 snapshot measurement, API payload budgets, web dist raw/gzip measurement, and a deterministic smoke-balance fixture check are implemented. The budgets are internal low-bandwidth guardrails rather than platform limits or accepted game-balance targets. See [CP-13 Balance / payload validation](CP-13_BALANCE_PAYLOAD_VALIDATION_2026-09-21.md). Closing CP-13 will not satisfy the full M1 Definition of Done because drop generation, equipment mutation/UI, and claim/equipment concurrency remain unresolved.

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
- W1-003 Risk/reward interfaces — validated for CP-14 contract scope
- W1-004 Seeded resolution — complete for current M1 scope
- W1-005 Failure/drop-loss model
- W1-006 Growth model

### W2 Data / Persistence
- W2-001 Player identity root
- W2-002 Core snapshot schema
- W2-003 Inventory snapshot schema
- W2-004 Recent archive schema
- W2-005 Snapshot versioning
- W2-006 Snapshot size metrics — validated for current M1 smoke loop
- W2-007 Optimistic locking
- W2-008 Mutation guard
- W2-009 Atomic Level-2 mutation
- W2-010 Atomic Level-3 claim mutation — complete
- W2-011 D1 migrations — complete
- W2-012 Repository interfaces — complete

### W3 Backend API
- W3-001 `/api/health` — complete
- W3-002 guest player bootstrap — complete
- W3-003 state read — complete
- W3-004 zone read — complete with provisional M1 smoke catalog
- W3-005 expedition start — complete with provisional server duration provider
- W3-006 expedition current state — complete
- W3-007 expedition claim — complete with provisional server resolution/retention providers
- W3-008 inventory read — complete
- W3-009 equipment mutation — implementation complete; validation pending
- W3-010 API error contract

### W4 Frontend
- W4-001 mobile shell — complete
- W4-002 destination card — complete
- W4-003 metrics panel — complete
- W4-004 duration selector — complete
- W4-005 exploration state screen — complete
- W4-006 result screen — complete
- W4-007 inventory/equipment minimum
- W4-008 compact number formatting
- W4-009 low-bandwidth asset measurement — validated for current web build

### W5 Validation
- W5-001 unit tests for game-core
- W5-002 snapshot serialization tests
- W5-003 optimistic-lock conflict tests
- W5-004 double-claim tests — complete for current exploration loop
- W5-005 worker/D1 integration tests — complete for current exploration loop
- W5-006 playable-loop test — complete
- W5-007 balance simulation harness — provisional smoke-fixture validation implemented; formal balance work pending
- W5-008 payload / snapshot-size metrics — validated for current M1 smoke loop

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
CP-07 Start exploration persistence — complete
↓
CP-08 Claim calculation — complete
↓
CP-09 Atomic Level-3 claim mutation — complete
↓
CP-10 Guest bootstrap + API wiring — complete
↓
CP-11 Mobile pre/exploring/result UI integration — complete
↓
CP-12 Playable loop test — complete
↓
CP-13 Balance/payload validation — complete
↓
CP-14 M1 reward/drop contract — complete
↓
CP-15 Seeded M1 resolution with real drop — complete
↓
CP-16 Equipment domain + atomic persistence/API — implementation complete; validation pending
↓
CP-17 Inventory/equipment minimum UI
↓
CP-18 Claim/equipment race and failure validation
↓
CP-19 Full M1 acceptance loop
↓
M1 Playable Solo Prototype
```

## 5. CP blockers

### Hard blockers
- CP-14 M1 reward/drop contract not implemented
- CP-15 seeded M1 resolution with a real item drop not implemented
- CP-16 W3-009 equipment mutation / atomic persistence not implemented
- CP-17 W4-007 inventory/equipment minimum UI not implemented
- CP-18 claim/equipment concurrency safety not yet proven
- CP-19 full M1 DoD acceptance loop not yet proven

### Non-blockers
- W1-005 Failure/drop-loss model
- W1-006 Growth model
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
