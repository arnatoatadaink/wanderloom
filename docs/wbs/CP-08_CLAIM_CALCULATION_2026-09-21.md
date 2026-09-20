# CP-08 Claim Calculation — Implementation Note

## Status

Implementation complete on `feat/cp-08-claim-calculation`. Workspace-level WSL validation is pending.

## Scope

CP-08 implements the pure claim-calculation boundary in `packages/game-core`.

The calculation consumes:

- current core snapshot
- current inventory snapshot
- the active exploration
- a pre-resolved exploration outcome
- server-authoritative claim time

It produces:

- next core snapshot
- next inventory snapshot
- recent archive entry
- previous core/inventory state versions for the later atomic mutation step

## Behavior

A claim is accepted only when the active exploration is `ready_to_claim` and the supplied exploration ID matches the core snapshot.

On success:

- core state version increments
- inventory state version increments
- EXP and Gold are applied
- drops are appended to inventory
- active exploration is cleared
- archive entry is created with pending sync state

## Resolution boundary

Exact survival, reward, rarity, drop-rate, and growth formulas are not fixed here because those W1-003 through W1-006 decisions remain open.

Instead, CP-08 introduces `ExplorationResolution` as the pure boundary consumed by claim calculation. Later E-003/W1 work can generate that structure from the exploration seed, character snapshot, zone data, and balance configuration without changing the claim application contract.

No D1, Worker, crypto, or DOM dependency is introduced.

## Validation target

Run in WSL:

```bash
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Once these pass, CP-08 can be closed. The next critical-path target is CP-09: Atomic Level-3 claim mutation.
