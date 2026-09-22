# CP-15 Seeded M1 Resolution with Real Drop — 2026-09-22

## Status

Implementation complete on `feat/cp-15-seeded-m1-resolution`. WSL validation is pending.

## Objective

Replace the production no-drop smoke resolver with a deterministic seeded M1 resolver that produces a real inventory item and preserves the existing exactly-once claim path.

## Seeded resolver

Added `resolveSeededM1Exploration()` in `packages/game-core`.

Inputs:

- seed
- explorationId
- zoneId
- durationId

Outputs:

- result
- Gold
- EXP
- generated drops
- summary metrics

The resolver is pure and has no Worker, D1, crypto, clock, or UUID dependency.

Current M1 provisional behavior:

- result: success
- Gold: 5–6, selected deterministically from the seed
- EXP: 10
- drops: exactly 1
- item definition: `m1-wayfarer-charm`

These values remain M1 implementation fixtures, not final balance.

## Drop materialization

The Worker keeps runtime identity generation outside game-core.

Claim flow:

```text
ActiveExploration.seed
→ resolveSeededM1Exploration()
→ GeneratedDrop
→ createItemInstanceId()
→ instantiateDrop()
→ ExplorationResolution
→ calculateClaim()
→ D1 atomic claim
```

The ItemInstance timestamp uses the authoritative claim timestamp.

## Production smoke resolver cleanup

The previous production `resolveM1SmokeExploration()` no-drop resolver has been removed.

The M1 zone catalog preview now advertises:

- Gold: 5–6
- EXP: 10–10
- Drops: 1–1

The preview and resolver are covered by tests.

## Real-D1 integration

The existing playable-loop integration test now verifies that a real drop is:

- returned by claim
- appended to the inventory snapshot
- recorded in the archive reward payload
- persisted through the real D1 integration path
- not duplicated by a repeated claim

The deterministic CP-15 test runtime uses:

- itemInstanceId: `item-instance-cp15`
- itemDefinitionId: `m1-wayfarer-charm`

The first integration seed (`seed-2`) deterministically produces Gold 6 / EXP 10 / one drop.

## Acceptance mapping

- pure seeded resolver: implemented
- same seed produces same result: covered by unit test
- reward remains within published preview: covered
- at least one M1 item definition can drop: implemented
- claim persists ItemInstance into inventory: integration coverage implemented
- archive records the same item: integration coverage implemented
- duplicate claim does not duplicate item: integration coverage implemented
- old no-drop production resolver retired: complete
- CP-13 snapshot/payload budgets remain active: pending WSL validation

## Deferred

CP-15 does not define:

- equipment slots
- item stats
- rarity probabilities
- failure/drop-loss rules
- long-term economy balance

Those are not required to prove the CP-15 real-drop boundary.

## Validation target

Run in WSL:

```bash
git fetch
git switch feat/cp-15-seeded-m1-resolution

pnpm typecheck
pnpm test
pnpm build
pnpm --filter @wanderloom/web measure:dist
git diff --check
```

After successful validation, CP-15 can be closed and CP-16 Equipment domain + atomic persistence/API can begin.
