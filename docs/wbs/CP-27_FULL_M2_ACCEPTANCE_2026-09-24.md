# CP-27 Full M2 Acceptance — Implementation — 2026-09-24

## Status

In progress.

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

## Acceptance dependency

CP-27 remains open until the complete workspace validation passes after these integration changes:

- `pnpm -r typecheck`
- `pnpm -r test`
- `pnpm -r build`
- `git diff --check`

The CP-26 real-D1 failure/progression/retry regression must also remain green, because the CP-27 success/equip loop is combined with that evidence for the full success/failure acceptance boundary.

## Exit

If the full suite remains green, CP-27 can be marked **Accepted / Complete**, merged to `m2`, and the **M2 Solo Progression Slice** can be closed.
