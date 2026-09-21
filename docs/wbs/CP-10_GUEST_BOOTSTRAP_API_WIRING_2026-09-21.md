# CP-10 Guest Bootstrap + API Wiring — Implementation Note

## Status

Core API wiring is implemented and WSL-validated on `feat/cp-10-guest-bootstrap-api-wiring`.

CP-10 is not yet closed because server-side game-rule providers remain unresolved for the zone catalog, duration resolution, exploration resolution, and recent-archive retention policy.

## Implemented HTTP surface

Implemented and directly functional:

- `GET /api/health`
- `POST /api/guest/bootstrap`
- `GET /api/state`
- `GET /api/inventory`
- `GET /api/explorations/current`

Player-scoped routes use the temporary M1 guest transport header:

`x-wanderloom-player-id`

The bootstrap endpoint creates the player root, core snapshot, and inventory snapshot in one D1 batch and returns the generated guest player ID.

## Start / claim wiring

The following routes are structurally wired to the existing domain and persistence layers:

- `POST /api/explorations`
- `POST /api/explorations/:id/claim`

Start accepts only action inputs (`zoneId`, `durationId`). Duration in milliseconds is resolved server-side through `resolveDurationMs`; the client does not provide authoritative timestamps, snapshots, seed, nonce, or duration milliseconds.

Claim reads authoritative core/inventory snapshots, requests a server-side `ExplorationResolution`, runs `calculateClaim`, then commits through `D1AtomicMutationRepository`.

No reward/result snapshot is accepted from the client.

## Provisional M1 smoke providers

To make the CP-10 exploration HTTP loop executable without pretending that game balance is settled, the default Worker runtime now uses an explicitly provisional `m1-smoke` ruleset:

- one smoke-test zone: `m1-smoke-frontier`
- one duration: `short` = 300000 ms
- deterministic result: `success`
- Gold reward: 5
- EXP reward: 10
- drops: none
- recent archive retention: 3

These values are implementation-test fixtures, not accepted game-balance decisions. They are isolated in `m1-smoke-rules.ts` and are intended to be replaced by W1-003 through W1-006 outputs.

`GET /api/zones`, expedition start, and expedition claim can now use default server-side providers instead of returning `not_ready`.

Equipment mutation remains deliberately unresolved because drop generation and equipment-slot vocabulary are not yet fixed.

## Guest bootstrap baseline

The technical bootstrap state is intentionally minimal:

- schema version 1
- state version 0
- level 1
- EXP 0
- Gold 0
- empty character stats
- empty inventory/equipment/stackables

No game-balance bonuses or starting equipment are introduced.

## Added persistence/API components

- `D1InventorySnapshotRepository`
- `bootstrapGuestPlayer`
- `createApi`
- Worker routing through `createApi`
- API tests for health, bootstrap, identity requirement, and unresolved game-data route behavior

## Validation result

WSL validation passed:

- workspace typecheck: passed for `apps/web`, `packages/game-core`, and `workers/api`
- workspace tests: passed
  - `apps/web`: 1 test
  - `packages/game-core`: 16 tests across 7 files
  - `workers/api`: 10 tests across 4 files, including 4 API wiring tests
- workspace build: passed
  - Vite production build
  - `game-core` TypeScript build
  - Wrangler dry-run build with `env.DB` D1 binding
- Worker dry-run upload size: 25.79 KiB / gzip 4.86 KiB
- `git diff --check`: passed

The provisional providers required for zones/start/claim are now implemented. Re-validation is required before CP-10 is closed. Equipment mutation remains outside the CP-10 exploration-loop closure because its prerequisites (drop generation and equipment-slot vocabulary) remain unresolved W1 work.
