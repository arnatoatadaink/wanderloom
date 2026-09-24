# CP-21 Growth / Progression Model — Validation — 2026-09-23

## Status

**Accepted / Complete**

CP-21 establishes the M2 game-core progression boundary and connects claimed expedition EXP to deterministic level progression while preserving the existing M1-compatible claim path.

## Accepted implementation

- `ProgressionRule` defines max level and per-level EXP requirement.
- `applyProgressionExp()` is a pure deterministic progression calculation.
- EXP can carry across multiple level boundaries.
- max-level behavior is explicit.
- negative, unsafe-integer, and EXP-overflow inputs are rejected.
- Gold is not modified by the progression calculation.
- `calculateClaim()` can route claimed EXP through the progression resolver.
- `progressionRule` remains optional so the existing M1 simple-EXP path is preserved.
- no snapshot schema migration is required by CP-21.

## Balance boundary

The EXP curve used in tests is contract-test data only. Production progression/balance values are not fixed by CP-21 and remain subject to later balance work.

## Local acceptance evidence

User-reported WSL validation on 2026-09-23:

- `pnpm -r typecheck`: PASS across game-core / web / Worker
- `pnpm -r test`: PASS
  - game-core: 13 files / 35 tests
  - web: 3 files / 9 tests
  - Worker: 8 files / 21 tests
  - total: 65 tests
- `git diff --check`: clean

## Exit

CP-21 is accepted. Integration target is `m2`. The next critical-path item is **CP-22 Rarity + Multi-zone Contract**.
