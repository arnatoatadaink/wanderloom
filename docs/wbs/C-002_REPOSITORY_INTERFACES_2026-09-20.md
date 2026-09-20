# C-002 Repository Interfaces — Implementation Note

## Status

Implementation and WSL workspace validation complete on `feat/c-002-repository-interfaces`.

## Scope

C-002 / W2-012 / CP-05 defines storage-agnostic repository contracts in `packages/game-core`:

- `PlayerRepository`
- `CoreSnapshotRepository`
- `InventorySnapshotRepository`
- `ArchiveRepository`
- `AtomicMutationRepository`

The contracts depend only on existing game-core domain types. They do not import D1, Wrangler, Workers, or DOM APIs.

## Atomic mutation boundary

`AtomicMutationRepository` accepts a discriminated union with three currently required persistence boundaries:

- `core`
- `core_inventory`
- `claim`

This establishes the contract required by the later D-001 through D-003 work without fixing the D1 implementation strategy inside game-core.

The claim variant carries the claim nonce, expected core/inventory versions, next snapshots, and archive entry. Mutation guards and D1 batch details remain Worker-layer implementation concerns.

## Validation added

`packages/game-core/src/repository-contracts.test.ts` provides compile-time/runtime smoke coverage for all five interfaces and the atomic mutation union.

WSL validation completed successfully with the pinned project toolchain:

- workspace typecheck: passed for `packages/game-core`, `apps/web`, and `workers/api`
- workspace tests: passed
  - `apps/web`: 1 test
  - `workers/api`: 1 test
  - `packages/game-core`: 6 tests across 4 files, including 2 repository-contract tests
- workspace build: passed
  - Vite production build
  - `game-core` TypeScript build
  - Wrangler dry-run build with `env.DB` D1 binding
- `git diff --check`: passed with no diff issues

C-002 / W2-012 / CP-05 is complete. The next critical-path target is CP-06 / E-001 exploration state machine.
