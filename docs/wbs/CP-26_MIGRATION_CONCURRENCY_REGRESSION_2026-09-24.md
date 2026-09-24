# CP-26 Migration / Concurrency Regression — Implementation — 2026-09-24

## Status

**Accepted / Complete**

## Objective

Prove that the M2 additions introduced through CP-20 through CP-25 preserve snapshot persistence, atomic claim semantics, retry safety, and the existing M1 real-D1 acceptance path.

## Existing coverage retained

The pre-CP-26 suite already covers:

- real-D1 M1 playable loop
- exactly-once duplicate claim behavior
- response-lost-after-commit retry classification
- claim/equipment winner-order races
- stale inventory-version rejection
- guarded claim batch completeness
- inventory-only CAS
- M1 snapshot and payload budgets

## CP-26 additions

### A. Extended exploration snapshot round-trip

Verify that an exploration started through the CP-23/25 path persists and reloads the extended frozen character snapshot through real D1:

- effective `stats`
- `baseStats`
- frozen `equipmentEffects`

No schema-version bump is required because the snapshot remains JSON-backed and the additional shape is backward-compatible with the current repository serialization boundary.

### B. M2 failure + progression atomic claim

Verify in real D1 that one failure claim:

- persists `result = failure`
- applies only retained Gold/EXP
- applies retained EXP through the progression rule exactly once
- stores the failure reward/loss summary in the archive
- clears the active exploration
- does not materialize a lost drop
- rejects a duplicate retry as `already_claimed`
- leaves persisted progression unchanged after the rejected retry

## Acceptance evidence

User-reported WSL validation on 2026-09-24:

- `pnpm -r typecheck`: PASS across game-core / web / Worker.
- `pnpm -r test`: PASS.
  - game-core: 16 files / 47 tests.
  - web: 3 files / 10 tests.
  - Worker: 9 files / 23 tests.
  - total: **80 tests**.
- CP-26 real-D1 regression: 2 tests PASS.
- CP-18 claim/equipment race regression: 3 tests PASS.
- CP-19 playable-loop real-D1 regression: PASS.
- `pnpm -r build`: PASS.
  - Web: production Vite build PASS.
  - game-core: TypeScript build PASS.
  - Worker: Wrangler dry-run build PASS.
- Web bundle:
  - JS: 15.95 kB raw / 4.55 kB gzip.
  - CSS: 4.09 kB raw / 1.53 kB gzip.
  - HTML: 0.39 kB raw / 0.26 kB gzip.
- Worker dry-run upload: 44.37 KiB raw / 8.67 KiB gzip.
- `git diff --check`: clean.
- `workers/api/.wrangler/` remains an untracked local runtime directory and is not accepted as repository content.

## Exit criteria

All CP-26 exit criteria are satisfied:

- M2 extended snapshot round-trip passes with real D1
- M2 failure/progression claim passes with real D1
- duplicate/retry safety remains deterministic
- claim/equipment race tests remain green
- M1 real-D1 acceptance remains green
- workspace typecheck/test/build and diff check pass

Next critical-path item: **CP-27 Full M2 Acceptance**.
