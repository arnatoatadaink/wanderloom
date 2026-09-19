# B-001 through B-005 Domain Contracts — 2026-09-19

Status: implementation and local validation complete on `feat/b-001-b-004-domain-contracts`.

> Historical note: this file name predates B-005. The branch was extended in place
> with B-005 so the full Batch B contract set remains reviewable as one change set.

## Scope

Implemented the domain contracts requested by
`NEXT_PHASE_IMPLEMENTATION_DETAIL_2026-09-18.md`:

- B-001 IDs
- B-002 Core Snapshot
- B-003 Inventory Snapshot
- B-004 Archive Entry
- B-005 Mutation results/errors

## Decisions encoded

### IDs

The five required IDs are branded strings:

- `PlayerId`
- `ExplorationId`
- `ItemInstanceId`
- `ItemDefinitionId`
- `ZoneId`

The branding prevents accidental cross-assignment while preserving JSON string
serialization.

### Core snapshot

`PlayerCoreSnapshot` contains:

- `schemaVersion`
- `stateVersion`
- player identity
- character state
- progression (`level`, `exp`, `gold`)
- optional active exploration
- update timestamp

`ActiveExploration` carries the accepted server-authoritative timing, seed,
claim nonce, zone, duration identifier, and character snapshot.

### Character stats

Concrete combat-stat names are intentionally not fixed in Batch B.
`CharacterStats` is a readonly numeric record so later exploration/balance work
can define the vocabulary without changing snapshot ownership.

### Inventory snapshot

`PlayerInventorySnapshot` separates:

- equipment slot mapping
- unique item instances
- stackable quantities

Equipment-slot vocabulary is intentionally deferred. Item instances use separate
instance and definition IDs.

### Archive

`ExplorationArchiveEntry` records exploration identity/timing, result, reward
summary, numeric summary metrics, and sync state.

`ArchiveSyncState` is explicitly `pending` or `synced`; `syncedAt` is only
a timestamp in the synced state. This keeps Google appDataFolder sync outside
the atomic claim transaction while retaining the D1 recent-archive buffer
contract.

### Mutation results and errors

`MutationResult<Value, Error>` is a discriminated success/failure union. The
stable mutation-error codes are:

- `version_conflict` — `VersionConflict`
- `already_claimed` — `AlreadyClaimed`
- `invalid_exploration_state` — `InvalidExplorationState`
- `snapshot_integrity_error` — `SnapshotIntegrityError`

`InvalidExplorationState` deliberately keeps state names as strings until the
E-001 exploration state machine owns that vocabulary.

`SnapshotKind` currently covers `core` and `inventory`. Whether archive
integrity uses this same error contract is deferred to C-004.

## Deferred by design

The following are not fixed here because they belong to later batches:

- exact combat stat vocabulary and formulas
- equipment slot vocabulary
- exploration result/outcome vocabulary
- serialization/parsing and schema migration behavior (C-003)
- integrity/range validation implementation (C-004)
- exploration state-machine implementation (E-001)

## Validation

Validated locally with project-pinned pnpm 10.17.1:

- `pnpm typecheck` — PASS
- `pnpm test` — PASS, 5 tests
- `pnpm build` — PASS
- `git diff --check` — PASS

No deployment is required for Batch B.
