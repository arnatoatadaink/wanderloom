# E-001 Exploration State Machine — Implementation Note

## Status

Implementation and WSL workspace validation complete on `feat/e-001-exploration-state-machine`.

## Scope

E-001 / W1-002 / CP-06 implements the M1 exploration lifecycle in `packages/game-core`:

```text
idle -> exploring -> ready_to_claim -> claimed
```

Only the forward lifecycle is allowed. Skipped and repeated transitions are rejected.

## Persisted-state derivation

`deriveExplorationState(activeExploration, now)` derives:

- `idle` when no active exploration exists
- `exploring` before `endsAt`
- `ready_to_claim` at and after `endsAt`

`claimed` is intentionally not derived from `PlayerCoreSnapshot`. A successful claim removes the active exploration from the core snapshot; claim history belongs to the archive layer.

## API

Added:

- `ExplorationState`
- `ExplorationEvent`
- `canTransitionExploration`
- `transitionExploration`
- `deriveExplorationState`

## Tests

`packages/game-core/src/exploration-state.test.ts` covers:

- the complete forward lifecycle
- skipped/repeated transition rejection
- idle derivation
- exploring derivation before the end time
- ready-to-claim derivation at and after the end time

WSL validation completed successfully:

- workspace typecheck: passed for `workers/api`, `packages/game-core`, and `apps/web`
- workspace tests: passed
  - `workers/api`: 1 test
  - `apps/web`: 1 test
  - `packages/game-core`: 11 tests across 5 files, including 5 exploration-state tests
- workspace build: passed
  - Vite production build
  - `game-core` TypeScript build
  - Wrangler dry-run build with `env.DB` D1 binding
- `git diff --check`: passed with no diff issues

E-001 / W1-002 / CP-06 is complete. The next critical-path target is CP-07: start exploration persistence.
