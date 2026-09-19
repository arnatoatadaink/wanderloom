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
  readonly activeExploration: ActiveExploration | null;
  readonly updatedAt: IsoDateTime;
}
