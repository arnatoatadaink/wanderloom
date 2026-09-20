# C-002 Repository Interfaces — Implementation Note

## Status

Implementation complete on `feat/c-002-repository-interfaces`. Workspace-level validation remains to be run in the project WSL environment.

## Scope

C-002 / W2-012 / CP-05 defines storage-agnostic repository contracts in `packages/game-core`:

- `PlayerRepository`
- `CoreSnapshotRepository`
- `InventorySnapshotRepository`
- `ArchiveRepository`
- `AtomicMutationRepository`

The contracts depend only on existing game-core domain types. They do not import D1, Wrangler, Workers, or DOM APIs.

## Atomic mutation boundary

`AtomicMutationRepository` accepts a discriminated union with three currently required persistence boundaries:

- `core`
- `core_inventory`
- `claim`

This establishes the contract required by the later D-001 through D-003 work without fixing the D1 implementation strategy inside game-core.

The claim variant carries the claim nonce, expected core/inventory versions, next snapshots, and archive entry. Mutation guards and D1 batch details remain Worker-layer implementation concerns.

## Validation added

`packages/game-core/src/repository-contracts.test.ts` provides compile-time/runtime smoke coverage for all five interfaces and the atomic mutation union.

A standalone strict TypeScript compile of the domain sources succeeded in the current execution environment. Full repository validation with the pinned project toolchain was not runnable here because this runtime has no pnpm installation and cannot resolve github.com for cloning.

Run in the project WSL environment:

```bash
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Once those pass, CP-05 can be closed and the next critical-path target is CP-06 / E-001 exploration state machine.
