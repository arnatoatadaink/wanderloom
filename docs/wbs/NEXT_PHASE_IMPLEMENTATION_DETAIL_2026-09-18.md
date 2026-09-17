# Wanderloom Next Phase Detail — Implementation Specification

## Phase

Implementation specification / pre-coding detail.

## Objective

Turn the accepted architecture into code-ready contracts without reopening settled product-design questions.

## Batch A — Foundation

### A-001 Workspace
Create:
- root package.json
- pnpm-workspace.yaml
- tsconfig.base.json
- apps/web
- workers/api
- packages/game-core

Acceptance:
- `pnpm install`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

### A-002 Tooling
Decide exact versions/config for:
- TypeScript
- Vite
- Vitest
- Wrangler
- Cloudflare Vitest plugin

### A-003 ADRs
Record:
- pnpm monorepo
- Vanilla TS frontend
- single Worker deployment
- pure game-core
- hybrid snapshots
- atomic D1 mutation strategy

## Batch B — Domain Contracts

### B-001 IDs
Define:
- PlayerId
- ExplorationId
- ItemInstanceId
- ItemDefinitionId
- ZoneId

### B-002 Core Snapshot
Define:
- PlayerCoreSnapshot
- CharacterState
- CharacterStats
- ProgressionState
- ActiveExploration

### B-003 Inventory Snapshot
Define:
- PlayerInventorySnapshot
- EquipmentState
- ItemInstance
- StackableState

### B-004 Archive Entry
Define:
- ExplorationArchiveEntry
- RewardSummary
- ArchiveSyncState

### B-005 Mutation results/errors
Define:
- VersionConflict
- AlreadyClaimed
- InvalidExplorationState
- SnapshotIntegrityError

## Batch C — D1 Contracts

### C-001 Migration SQL
Create:
- players
- player_core
- player_inventory
- recent_archive
- player_mutation_guards
- required indexes

### C-002 Repository interfaces
Define:
- PlayerRepository
- CoreSnapshotRepository
- InventorySnapshotRepository
- ArchiveRepository
- AtomicMutationRepository

### C-003 Serialization
Implement:
- parseCoreSnapshot
- serializeCoreSnapshot
- parseInventorySnapshot
- serializeInventorySnapshot
- snapshot byte measurement
- schemaVersion migration hook

### C-004 Integrity validation
Check:
- column level/exp/gold == snapshot values
- required fields
- finite numeric ranges
- schemaVersion support

## Batch D — Atomic Mutation Detail

### D-001 Level 1 mutation
Single snapshot optimistic update.

### D-002 Level 2 mutation
Core + inventory update guarded by expected versions.

### D-003 Level 3 claim mutation
Atomic batch:
1. acquire mutation guard
2. update core
3. update inventory
4. insert recent archive
5. prune recent archive
6. release guard

### D-004 Retry behavior
- max automatic retries: 1–2
- unresolved conflict → HTTP 409
- claim already committed → `already_claimed`

### D-005 Failure tests
Test:
- simultaneous claim/claim
- claim/equip race
- Worker dies before write
- batch SQL failure
- response lost after commit

## Batch E — Exploration Core

### E-001 State machine
IDLE → EXPLORING → READY_TO_CLAIM → CLAIMED

### E-002 Start expedition
Inputs:
- player
- zone
- duration
- resolved character stats

Outputs:
- exploration id
- server timestamps
- seed
- character snapshot
- claim nonce

### E-003 Resolution
Pure functions for:
- survival
- reward expectation
- final outcome
- drop generation
- EXP/gold application

### E-004 Claim
Input old core + inventory + exploration.
Output new core + inventory + archive entry.

No D1 dependency inside game-core.

## Batch F — Minimal API

Implement:
- GET `/api/health`
- GET `/api/state`
- GET `/api/zones`
- POST `/api/explorations`
- GET `/api/explorations/current`
- POST `/api/explorations/:id/claim`
- GET `/api/inventory`
- POST `/api/equipment`

The client sends actions, never authoritative snapshots.

## Recommended next-session starting point

Start with A-001 through B-004.

Do not implement UI/game balance first.

Reason:
- all later backend and frontend contracts depend on shared types
- snapshot/mutation correctness is the main technical risk
- UI can proceed in parallel once response DTOs are stable

First implementation checkpoint:

```text
workspace builds
+ domain types compile
+ D1 migration applies
+ snapshot round-trip test passes
```

Second checkpoint:

```text
start expedition
+ claim expedition
+ duplicate claim prevented
+ claim/equipment race tested
```
