import type { ExplorationId, PlayerId, ZoneId } from "./ids";

export type IsoDateTime = string;

export type CharacterStats = Readonly<Record<string, number>>;

export interface CharacterState {
  readonly stats: CharacterStats;
}

export interface ProgressionState {
  readonly level: number;
  readonly exp: number;
  readonly gold: number;
}

export interface ActiveExploration {
  readonly explorationId: ExplorationId;
  readonly zoneId: ZoneId;
  readonly durationId: string;
  readonly startedAt: IsoDateTime;
  readonly endsAt: IsoDateTime;
  readonly seed: string;
  readonly claimNonce: string;
  readonly characterSnapshot: CharacterState;
}

export interface PlayerCoreSnapshot {
  readonly schemaVersion: number;
  readonly stateVersion: number;
  readonly playerId: PlayerId;
  readonly character: CharacterState;
  readonly progression: ProgressionState;
  /**
   * Optional for compatibility with snapshots created before ADR-024.
   * Missing values are interpreted as Rank 0 by readPlayerZoneRank().
   */
  readonly zoneRank?: number;
  readonly activeExploration: ActiveExploration | null;
  readonly updatedAt: IsoDateTime;
}

export function readPlayerZoneRank(snapshot: PlayerCoreSnapshot): number {
  const zoneRank = snapshot.zoneRank ?? 0;
  if (!Number.isSafeInteger(zoneRank) || zoneRank < 0) {
    throw new RangeError("zoneRank must be a non-negative safe integer");
  }
  return zoneRank;
}
