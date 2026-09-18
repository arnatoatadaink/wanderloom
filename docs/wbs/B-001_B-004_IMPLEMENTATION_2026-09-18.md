# B-001 through B-004 Domain Contracts — 2026-09-18

Status: implemented on `feat/b-001-b-004-domain-contracts`; local validation pending.

## Scope

Implemented the domain contracts requested by
`NEXT_PHASE_IMPLEMENTATION_DETAIL_2026-09-18.md`:

- B-001 IDs
- B-002 Core Snapshot
- B-003 Inventory Snapshot
- B-004 Archive Entry

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

`ActiveExploration` carries the already accepted server-authoritative timing,
seed, claim nonce, zone, duration identifier, and character snapshot.

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

`ExplorationArchiveEntry` records exploration identity/timing, result,
reward summary, numeric summary metrics, and sync state.

`ArchiveSyncState` is explicitly `pending` or `synced`; `syncedAt` is only
present as a timestamp in the synced state. This keeps Google appDataFolder sync
outside the atomic claim transaction while retaining the D1 recent-archive
buffer contract.

## Deferred by design

The following are not fixed here because they belong to later batches:

- exact combat stat vocabulary and formulas
- equipment slot vocabulary
- exploration result/outcome vocabulary
- serialization/parsing and schema migration behavior (C-003)
- integrity/range validation (C-004)
- mutation result/error types (B-005)
- exploration state-machine implementation (E-001)

## Validation target

Run:

```text
pnpm typecheck
pnpm test
pnpm build
```

The added smoke test constructs compatible core, inventory, and archive
snapshots so TypeScript validates the contracts together.
