# CP-17 Inventory / Equipment Minimum UI — 2026-09-22

## Status

Implementation complete on `feat/cp-17-inventory-equipment-ui`. WSL validation is pending.

## Objective

Expose the CP-16 equipment backend through a minimum low-bandwidth UI:

- inventory read
- item list
- equipped state
- one equip action
- client-side state reconciliation after equip

## Web API contract

`InventoryDto` now includes:

- `stateVersion`
- `equipment.slots`
- `items`

The web API client now implements:

- `getInventory()`
- `equipItem(slot, itemInstanceId, expectedInventoryStateVersion)`

The client sends only the action and expected version.

## View model

`AppViewModel` now retains the current inventory snapshot.

Initial app load fetches inventory alongside zones, core state, and active exploration.

Claim success replaces the local inventory with the authoritative inventory returned by the claim response.

Equip success replaces the local inventory with the authoritative inventory returned by `POST /api/equipment`.

## Minimum UI

The Ready and Result views now render a compact inventory panel.

Current M1 behavior:

- lists each owned item
- shows item definition ID and shortened instance ID
- shows whether the item is currently equipped in the `charm` slot
- exposes one `Equip` action
- disables the action when the item is already equipped or another mutation is busy

No image, font, framework, or other heavy asset dependency was added.

## Error behavior

Equipment errors use the existing app error path and are surfaced as the server error code + HTTP status.

A failed equipment mutation does not replace the locally held inventory snapshot.

CP-18 will separately validate simultaneous claim/equipment races and stale-write retry behavior.

## Tests

The API-client test now covers:

- inventory read
- equipment mutation request body
- expected inventory state version
- authoritative equipped inventory response

## Acceptance mapping

- inventory list: implemented
- equipped state display: implemented
- minimum equip action: implemented
- API client equipment mutation: implemented
- equip reconciliation: implemented
- no heavy asset dependency: preserved
- CP-13 bundle budget: pending WSL validation

## Validation target

Run in WSL:

```bash
git fetch
git switch feat/cp-17-inventory-equipment-ui

pnpm typecheck
pnpm test
pnpm build
pnpm --filter @wanderloom/web measure:dist
git diff --check
```

After successful validation, CP-17 can be closed and CP-18 claim/equipment race and failure validation can begin.
