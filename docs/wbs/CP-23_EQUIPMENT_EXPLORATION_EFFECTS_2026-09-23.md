# CP-23 Equipment Effects → Exploration — Validation — 2026-09-23

## Status

**Accepted / Complete**

CP-23 establishes the M2 equipment-to-exploration boundary: equipped effects are resolved at exploration start and frozen into the active exploration snapshot.

## Accepted implementation

- Equipment effect definitions map item definitions to stat modifiers.
- Equipped item instances are resolved from the inventory snapshot.
- Effective exploration stats are derived from base character stats plus equipped modifiers.
- The frozen snapshot records base stats, effective stats, and the applied equipment effects.
- Snapshot data is detached from mutable configuration inputs.
- `startExploration()` can consume inventory + equipment-effect definitions and freezes the resulting effective character state.
- Later equipment/configuration changes cannot rewrite an already-started exploration.
- Existing M1 callers remain compatible when inventory/effect definitions are omitted.
- Equipment strength/balance values are intentionally not fixed by CP-23.

## Local acceptance evidence

User-reported WSL validation on 2026-09-23:

- `pnpm -r typecheck`: PASS across game-core / web / Worker
- `pnpm -r test`: PASS
  - game-core: 15 files / 43 tests
  - web: 3 files / 9 tests
  - Worker: 8 files / 21 tests
  - total: 73 tests
- `git diff --check`: reported clean for the preceding checkpoint; no diff error was reported with final validation.

## Exit

CP-23 is accepted. Integration target is `m2`. The next critical-path item is **CP-24 Balance Simulator**.
