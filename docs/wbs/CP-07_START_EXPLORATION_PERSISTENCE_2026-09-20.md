# CP-07 Start Exploration Persistence — Implementation Note

## Status

Implementation and WSL validation complete on `feat/cp-07-start-exploration-persistence`. Initial validation found a TypeScript 7 test-only control-flow narrowing error in `start-exploration-persistence.test.ts`; the assertion pattern was corrected in commit `90db97b`, after which workspace typecheck passed.

## Scope

CP-07 connects the E-002 start-exploration domain operation to the D1 core snapshot persistence boundary.

Implemented:

- pure `startExploration` domain operation in `packages/game-core`
- state-version increment on successful start
- immutable character snapshot capture
- server timestamp-derived `endsAt`
- exploration ID / seed / claim nonce carried into the active exploration
- rejection when the player is not idle
- D1 `CoreSnapshotRepository` implementation
- compare-and-swap update using `WHERE player_id = ? AND state_version = ?`
- start-exploration persistence service using that optimistic-lock boundary
- observed state-version reload on CAS conflict

## Boundary decisions

Identifier, nonce, seed, and clock generation are intentionally injected into the domain operation rather than generated inside `game-core`. This keeps game-core deterministic and independent from Worker/crypto APIs. API wiring will generate these server-side in the later backend step.

The D1 repository currently performs direct JSON serialization/parsing. C-003 remains responsible for replacing this boundary with the formal snapshot serialization, byte measurement, and schema-version migration hooks.

CP-07 does not add `POST /api/explorations`; W3-005 remains pending until the API wiring stage.

## Files

- `packages/game-core/src/domain/start-exploration.ts`
- `packages/game-core/src/start-exploration.test.ts`
- `workers/api/src/persistence/d1-core-snapshot-repository.ts`
- `workers/api/src/services/start-exploration-persistence.ts`
- `workers/api/src/services/start-exploration-persistence.test.ts`

## Validation target

Run in WSL:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Validation summary:

- workspace typecheck: passed for `packages/game-core`, `apps/web`, and `workers/api`
- workspace tests: passed
  - `packages/game-core`: 13 tests
  - `workers/api`: 3 tests
  - `apps/web`: 1 test
- workspace build: passed, including Wrangler dry-run with `env.DB`
- `git diff --check`: passed

CP-07 is complete. The next critical-path target is CP-08: claim calculation.
