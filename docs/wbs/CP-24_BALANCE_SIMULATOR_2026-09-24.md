# CP-24 Balance Simulator — Validation — 2026-09-24

## Status

**Accepted / Complete**

CP-24 establishes a deterministic batch simulator for measuring M2 balance behavior without duplicating production game rules.

## Accepted implementation

- Reuses `resolveSeededExpedition()`, `generateSeededRarityDrops()`, and `applyProgressionExp()`.
- Repeated simulations derive deterministic per-iteration seeds from a supplied seed prefix.
- Reports success/failure counts and success rate.
- Reports generated and retained Gold/EXP totals plus per-run retained EV.
- Reports generated, retained, and lost drop counts under the configured failure policy.
- Reports generated rarity distribution.
- Reports final progression state and levels gained.
- Identical seeded inputs produce an identical complete report.
- Invalid iteration counts and mismatched zone configuration are rejected.

## Scope boundary

The simulator measures configured mechanics; it does not declare a production balance to be good or final.

Rarity counts intentionally describe generated rarity distribution. Retained/lost rarity histograms are deferred until a concrete tuning question requires them; retained/lost drop counts already expose the failure-policy loss dimension needed for the M2 checkpoint.

Fixture probabilities, weights, progression thresholds, and drop counts are test data rather than adopted production balance values.

## Local acceptance evidence

User-reported WSL validation on 2026-09-24:

- `pnpm -r typecheck`: PASS across game-core / web / Worker
- `pnpm -r test`: PASS
  - game-core: 16 files / 47 tests
  - web: 3 files / 9 tests
  - Worker: 8 files / 21 tests
  - total: 77 tests
- `git diff --check`: clean

## Exit

CP-24 is accepted. Integration target is `m2`. The next critical-path item is **CP-25 API / UI**.
