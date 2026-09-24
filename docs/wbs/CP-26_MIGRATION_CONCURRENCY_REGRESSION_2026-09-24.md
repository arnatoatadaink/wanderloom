# CP-26 Migration / Concurrency Regression — Implementation — 2026-09-24

## Status

In progress.

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

## Remaining CP-26 validation

After the new tests compile and pass:

1. run the complete workspace typecheck/test/build suite
2. retain the existing CP-18 concurrency suite as regression evidence
3. retain the CP-19 real-D1 M1 loop as backward-compatibility evidence
4. run `git diff --check`
5. record final test counts and accept CP-26 if all remain green

## Exit criteria

CP-26 can close when:

- M2 extended snapshot round-trip passes with real D1
- M2 failure/progression claim passes with real D1
- duplicate/retry safety remains deterministic
- claim/equipment race tests remain green
- M1 real-D1 acceptance remains green
- workspace typecheck/test/build and diff check pass

Next critical-path item after acceptance: **CP-27 Full M2 Acceptance**.
