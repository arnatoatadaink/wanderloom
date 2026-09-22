import type { ExplorationArchiveEntry } from "./archive";
import type { IsoDateTime, PlayerCoreSnapshot } from "./core-snapshot";
import type { ExplorationId, PlayerId } from "./ids";
import type { PlayerInventorySnapshot } from "./inventory-snapshot";
import type { MutationResult } from "./mutation-result";

export interface PlayerRecord {
  readonly playerId: PlayerId;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface PlayerRepository {
  findById(playerId: PlayerId): Promise<PlayerRecord | null>;
  insert(player: PlayerRecord): Promise<void>;
}

export interface CoreSnapshotRepository {
  findByPlayerId(playerId: PlayerId): Promise<PlayerCoreSnapshot | null>;
  insert(snapshot: PlayerCoreSnapshot): Promise<void>;
  updateIfVersionMatches(
    snapshot: PlayerCoreSnapshot,
    expectedStateVersion: number
  ): Promise<boolean>;
}

export interface InventorySnapshotRepository {
  findByPlayerId(playerId: PlayerId): Promise<PlayerInventorySnapshot | null>;
  insert(snapshot: PlayerInventorySnapshot): Promise<void>;
  updateIfVersionMatches(
    snapshot: PlayerInventorySnapshot,
    expectedStateVersion: number
  ): Promise<boolean>;
}

export interface ArchiveRepository {
  listRecent(
    playerId: PlayerId,
    limit: number
  ): Promise<readonly ExplorationArchiveEntry[]>;
  append(entry: ExplorationArchiveEntry): Promise<void>;
  pruneRecent(playerId: PlayerId, retainCount: number): Promise<number>;
  listPendingSync(
    playerId: PlayerId,
    limit: number
  ): Promise<readonly ExplorationArchiveEntry[]>;
  markSynced(
    playerId: PlayerId,
    explorationId: ExplorationId,
    syncedAt: IsoDateTime
  ): Promise<boolean>;
}

export interface CoreOnlyAtomicMutation {
  readonly kind: "core";
  readonly playerId: PlayerId;
  readonly expectedCoreStateVersion: number;
  readonly nextCore: PlayerCoreSnapshot;
}

export interface InventoryOnlyAtomicMutation {
  readonly kind: "inventory";
  readonly playerId: PlayerId;
  readonly expectedInventoryStateVersion: number;
  readonly nextInventory: PlayerInventorySnapshot;
}

export interface CoreInventoryAtomicMutation {
  readonly kind: "core_inventory";
  readonly playerId: PlayerId;
  readonly expectedCoreStateVersion: number;
  readonly nextCore: PlayerCoreSnapshot;
  readonly expectedInventoryStateVersion: number;
  readonly nextInventory: PlayerInventorySnapshot;
}

export interface ClaimAtomicMutation {
  readonly kind: "claim";
  readonly playerId: PlayerId;
  readonly claimNonce: string;
  readonly expectedCoreStateVersion: number;
  readonly nextCore: PlayerCoreSnapshot;
  readonly expectedInventoryStateVersion: number;
  readonly nextInventory: PlayerInventorySnapshot;
  readonly archiveEntry: ExplorationArchiveEntry;
}

export type AtomicMutation =
  | CoreOnlyAtomicMutation
  | InventoryOnlyAtomicMutation
  | CoreInventoryAtomicMutation
  | ClaimAtomicMutation;

export interface AtomicMutationCommit {
  readonly coreStateVersion: number;
  readonly inventoryStateVersion: number | null;
  readonly explorationId: ExplorationId | null;
}

export interface AtomicMutationRepository {
  commit(mutation: AtomicMutation): Promise<MutationResult<AtomicMutationCommit>>;
}
