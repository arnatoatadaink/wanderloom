# E-001 Exploration State Machine — Implementation Note

## Status

Implementation complete on `feat/e-001-exploration-state-machine`. Workspace-level WSL validation is pending.

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

Run in WSL:

```bash
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Once these pass, E-001 / W1-002 / CP-06 can be closed. The next critical-path target is CP-07: start exploration persistence.
