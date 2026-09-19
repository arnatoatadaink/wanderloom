import type { IsoDateTime } from "./core-snapshot";
import type { ItemInstance } from "./inventory-snapshot";
import type {
  ExplorationId,
  PlayerId,
  ZoneId
} from "./ids";

export interface RewardSummary {
  readonly gold: number;
  readonly exp: number;
  readonly drops: readonly ItemInstance[];
}

export type ArchiveSyncState =
  | {
      readonly status: "pending";
      readonly syncedAt: null;
    }
  | {
      readonly status: "synced";
      readonly syncedAt: IsoDateTime;
    };

export interface ExplorationArchiveEntry {
  readonly schemaVersion: number;
  readonly playerId: PlayerId;
  readonly explorationId: ExplorationId;
  readonly zoneId: ZoneId;
  readonly durationId: string;
  readonly startedAt: IsoDateTime;
  readonly endedAt: IsoDateTime;
  readonly claimedAt: IsoDateTime;
  /**
   * Outcome vocabulary is fixed later with the exploration resolution model.
   */
  readonly result: string;
  readonly rewards: RewardSummary;
  readonly summaryMetrics: Readonly<Record<string, number>>;
  readonly sync: ArchiveSyncState;
}
