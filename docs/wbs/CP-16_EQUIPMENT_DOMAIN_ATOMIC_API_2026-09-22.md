# CP-16 Equipment Domain + Atomic Persistence/API — 2026-09-22

## Status

Implementation complete on `feat/cp-16-equipment-domain-api`. WSL validation is pending.

## Objective

Close the M1 equipment backend boundary with the smallest safe mutation model:

- minimum equipment-slot vocabulary
- pure domain validation
- inventory-only optimistic CAS persistence
- HTTP equipment action
- stale-write protection
- retry-safe repeated equip

## Domain contract

Added `packages/game-core/src/domain/equipment.ts`.

M1 currently defines one slot:

- `charm`

`equipItem()` validates:

- slot is in the M1 slot vocabulary
- itemInstanceId is owned by the player's inventory

On success it:

- updates `equipment.slots[slot]`
- increments inventory `stateVersion`
- updates the authoritative timestamp

New mutation errors:

- `invalid_equipment_slot`
- `item_not_owned`

## Atomic persistence choice

Equipment does not modify the core snapshot.

CP-16 therefore adds an inventory-only atomic mutation instead of forcing a core + inventory write:

```text
kind: inventory
expectedInventoryStateVersion
nextInventory
```

D1 performs a single compare-and-swap UPDATE against `player_inventory.state_version`.

If the version is stale, the repository returns:

```text
version_conflict
snapshot: inventory
expectedVersion
actualVersion
```

This is sufficient for the equipment action itself and gives CP-18 a common inventory-version conflict boundary for claim/equipment race testing.

The existing `core_inventory` contract remains available but is not required by the current M1 equipment operation.

## API

`POST /api/equipment` is now implemented.

Request:

```json
{
  "slot": "charm",
  "itemInstanceId": "...",
  "expectedInventoryStateVersion": 1
}
```

The client sends an action and expected version, never an authoritative inventory snapshot.

Behavior:

- owned item + valid slot + current version -> update and 200
- same item already in the same slot -> idempotent 200 without another version increment
- stale inventory version -> 409 `version_conflict`
- invalid slot -> 400 `invalid_equipment_slot`
- unowned item -> 400 `item_not_owned`

## Real-D1 integration coverage

The existing playable-loop integration test now continues after CP-15 claim:

```text
claim real drop
→ equip m1-wayfarer-charm
→ verify inventory stateVersion increments
→ retry same equip idempotently
→ reject stale version
→ reject invalid slot
→ reject unowned item
→ read persisted equipped state
→ continue exploration loop
```

This proves the CP-16 sequential equipment path.

It does not yet prove simultaneous claim/equip behavior. That remains CP-18 by design.

## Acceptance mapping

- minimum M1 slot vocabulary: implemented
- pure equip validation: implemented
- equipment mutation errors: implemented
- inventory-only D1 CAS persistence: implemented
- `POST /api/equipment`: implemented
- optimistic version guard: implemented
- item ownership validation: implemented
- same-action retry safety: implemented
- existing claim path retained: integration coverage extended
- simultaneous claim/equipment safety: deferred to CP-18

## Validation target

Run in WSL:

```bash
git fetch
git switch feat/cp-16-equipment-domain-api

pnpm typecheck
pnpm test
pnpm build
pnpm --filter @wanderloom/web measure:dist
git diff --check
```

After successful validation, CP-16 can be closed and CP-17 Inventory/equipment minimum UI can begin.
