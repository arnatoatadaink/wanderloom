# CP-14 M1 Reward / Drop Contract — 2026-09-22

## Status

Implementation and WSL validation complete on `feat/cp-14-m1-reward-drop-contract`.

## Objective

Fix the minimum M1 reward/drop domain contract without choosing final economy values.

## Domain additions

Added `reward-drop-contract.ts` in `packages/game-core`.

The contract now defines:

- `NumericRewardRange`
- `DropCountRange`
- `RewardPreview`
- `DropGenerationInput`
- `GeneratedDrop`
- `DropGenerationResult`
- `InstantiateDropInput`
- `instantiateDrop()`

The split is intentional:

`DropGenerationInput -> GeneratedDrop`

represents deterministic game resolution, while

`GeneratedDrop + ItemInstanceId + createdAt -> ItemInstance`

represents materializing the generated reward into an inventory-owned item.

This keeps the seed/resolution boundary pure and avoids requiring D1 or runtime UUID generation inside game-core.

## Existing claim compatibility

The existing `ExplorationResolution` already carries:

- Gold
- EXP
- `ItemInstance[]` drops
- summary metrics

and `calculateClaim()` already appends those item instances to inventory and records them in the archive.

CP-14 therefore extends the missing generation/preview boundary rather than replacing the validated claim contract.

## API / Web contract

The provisional M1 zone duration now exposes a reward preview.

Current smoke preview:

- Gold: 5–5
- EXP: 10–10
- Drops: 0–0

These numbers remain test-fixture values, not accepted game balance.

The web client now has concrete item DTOs:

- `itemInstanceId`
- `itemDefinitionId`
- `createdAt`

The previous `unknown[]` inventory/drop types have been removed.

The ready screen now renders the server-provided Gold / EXP / drop-count preview instead of static fixture labels.

## CP-14 acceptance mapping

- explicit reward contract: implemented
- explicit drop-generation input/output: implemented
- deterministic seed boundary: represented by `DropGenerationInput.seed`
- item definition / instance creation boundary: implemented
- risk/reward preview DTO fields: implemented end-to-end
- no D1 dependency in game-core: preserved
- one future M1 drop can be represented without `unknown[]`: implemented

CP-14 does not yet generate a real drop. That is CP-15.

## Validation result

WSL validation results recorded so far:

- workspace typecheck: passed
  - `packages/game-core`
  - `apps/web`
  - `workers/api`
- workspace tests: passed
  - `packages/game-core`: 18 tests across 9 files
  - `apps/web`: 6 tests across 3 files
  - `workers/api`: 16 tests across 7 files
- workspace build: passed
  - web Vite build
  - `game-core` TypeScript build
  - Wrangler dry-run build
- Worker dry-run upload: 27.35 KiB / gzip 5.25 KiB
- web dist measurement:
  - total raw: 15,118 bytes
  - total gzip: 5,225 bytes
  - JavaScript gzip: 3,551 bytes
  - CSS gzip: 1,411 bytes
  - HTML gzip: 263 bytes
- CP-13 web payload budgets remain satisfied
- `git diff --check`: passed

CP-14 is closed. CP-15 can begin.
