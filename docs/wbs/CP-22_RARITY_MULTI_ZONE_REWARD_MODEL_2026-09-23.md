# CP-22 Rarity + Multi-zone Reward Model — Validation — 2026-09-23

## Status

**Accepted / Complete**

CP-22 establishes the M2 rarity, zone, and duration reward contract in game-core.

## Accepted implementation

- Seven rarity labels are explicit: Common / Uncommon / Rare / Epic / Legend / Mythic / Phantasm.
- Zone reward configuration owns the base drop table.
- A zone may make upper rarities unreachable by configuration.
- Duration independently controls deterministic drop count and optional per-rarity weight multipliers.
- Preview and seeded resolution consume the same zone/duration configuration.
- Multi-drop resolution derives deterministic per-drop seeds.
- Invalid zone/duration/weight configuration is rejected.
- Concrete production balance values are intentionally not fixed by CP-22.

## Balance boundary

Drop counts, rarity weights, and reachability used by tests are contract fixtures only. CP-24 remains responsible for measurement and tuning.

Gold/EXP duration scaling is not introduced by CP-22; it remains independent of this rarity/drop contract.

## Local acceptance evidence

User-reported WSL validation on 2026-09-23:

- `pnpm -r typecheck`: PASS across game-core / web / Worker
- `pnpm -r test`: PASS
  - game-core: 14 files / 40 tests
  - web: 3 files / 9 tests
  - Worker: 8 files / 21 tests
  - total: 70 tests
- `git diff --check`: clean

## Exit

CP-22 is accepted. Integration target is `m2`. The next critical-path item is **CP-23 Equipment effects → Exploration**.
