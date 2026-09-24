# CP-27 Full M2 Acceptance — Implementation — 2026-09-24

## Status

**Accepted / Complete**

## Objective

Close the M2 Solo Progression Slice with one end-to-end acceptance path covering:

compare choices → preview risk/reward → start with frozen state → success/failure → atomic claim → reward/loss + progression → inspect/equip rarity item → start again with changed effective stats.

## Gap review before CP-27

CP-20 through CP-26 had completed the domain and persistence pieces, but three runtime/UI gaps remained before the full M2 DoD could be claimed:

1. the default API catalog still exposed only one effective expedition choice
2. equipped item effects were not supplied to the default exploration-start runtime
3. generated rarity was dropped when a generated drop became an inventory item

These were integration gaps, not failures of the previously accepted CP-20 through CP-26 contracts.

## CP-27 implementation

- expose two provisional M2 smoke zones
- expose short/long duration choices for both zones
- keep risk and rarity previews attached to each duration
- resolve default duration through the M2 catalog
- resolve reward configuration by selected zone
- preserve generated rarity on instantiated item records
- serialize optional item rarity in inventory/archive JSON
- provide provisional equipment-effect definitions to exploration start
- freeze equipped effects into the next exploration snapshot
- expose frozen effective stats through the Web DTO
- display item rarity in inventory
- display frozen effective stats during exploration
- add a real-D1 CP-27 acceptance loop:
  - inspect multiple choices
  - start without equipment
  - claim a Rare item
  - verify rarity persists
  - equip the item
  - start again
  - verify the new frozen effective stats include the equipped effect

## Balance boundary

All new zone names, duration values, reward weights, rarity weights, failure probability, and stat modifiers remain **provisional smoke/test configuration**.

CP-27 validates the product loop and contract connectivity. It does not approve final production balance.

## Acceptance evidence

User-reported WSL validation on 2026-09-24:

- `pnpm -r typecheck`: PASS across game-core / web / Worker.
- `pnpm -r test`: PASS.
  - game-core: 16 files / 47 tests.
  - web: 3 files / 10 tests.
  - Worker: 10 files / 24 tests.
  - total: **81 tests**.
- CP-27 full M2 real-D1 acceptance loop: PASS.
- CP-26 real-D1 failure/progression/retry regression: PASS.
- CP-19 real-D1 playable-loop regression: PASS.
- CP-18 claim/equipment race regression: PASS.
- `git diff --check`: clean.
- Previous build validation for this CP-27 implementation set:
  - Web Vite production build: PASS.
  - game-core TypeScript build: PASS.
  - Worker Wrangler dry-run build: PASS.
  - Worker dry-run upload: 46.88 KiB raw / 9.03 KiB gzip.
- `workers/api/.wrangler/` remains an untracked local runtime directory and is not accepted as repository content.

## Exit

All CP-27 acceptance conditions are satisfied.

CP-27 is **Accepted / Complete**. Integration target is `m2`.

After integration, the **M2 Solo Progression Slice** is complete. Final production balance remains intentionally unresolved and is not part of this acceptance.
