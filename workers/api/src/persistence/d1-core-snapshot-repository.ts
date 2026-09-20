import type {
  CoreSnapshotRepository,
  PlayerCoreSnapshot,
  PlayerId
} from "@wanderloom/game-core";

interface D1RunResult {
  readonly meta?: {
    readonly changes?: number;
  };
}

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T>(): Promise<T | null>;
  run(): Promise<D1RunResult>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
}

interface CoreRow {
  snapshot_json: string;
}

export class D1CoreSnapshotRepository implements CoreSnapshotRepository {
  constructor(private readonly db: D1DatabaseLike) {}

  async findByPlayerId(playerId: PlayerId): Promise<PlayerCoreSnapshot | null> {
    const row = await this.db
      .prepare(
        "SELECT snapshot_json FROM player_core WHERE player_id = ?1 LIMIT 1"
      )
      .bind(playerId)
      .first<CoreRow>();

    return row === null
      ? null
      : (JSON.parse(row.snapshot_json) as PlayerCoreSnapshot);
  }

  async insert(snapshot: PlayerCoreSnapshot): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO player_core (
          player_id,
          schema_version,
          state_version,
          level,
          exp,
          gold,
          active_exploration_id,
          active_claim_nonce,
          snapshot_json,
          updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
      )
      .bind(
        snapshot.playerId,
        snapshot.schemaVersion,
        snapshot.stateVersion,
        snapshot.progression.level,
        snapshot.progression.exp,
        snapshot.progression.gold,
        snapshot.activeExploration?.explorationId ?? null,
        snapshot.activeExploration?.claimNonce ?? null,
        JSON.stringify(snapshot),
        snapshot.updatedAt
      )
      .run();
  }

  async updateIfVersionMatches(
    snapshot: PlayerCoreSnapshot,
    expectedStateVersion: number
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE player_core
         SET schema_version = ?2,
             state_version = ?3,
             level = ?4,
             exp = ?5,
             gold = ?6,
             active_exploration_id = ?7,
             active_claim_nonce = ?8,
             snapshot_json = ?9,
             updated_at = ?10
         WHERE player_id = ?1
           AND state_version = ?11`
      )
      .bind(
        snapshot.playerId,
        snapshot.schemaVersion,
        snapshot.stateVersion,
        snapshot.progression.level,
        snapshot.progression.exp,
        snapshot.progression.gold,
        snapshot.activeExploration?.explorationId ?? null,
        snapshot.activeExploration?.claimNonce ?? null,
        JSON.stringify(snapshot),
        snapshot.updatedAt,
        expectedStateVersion
      )
      .run();

    return (result.meta?.changes ?? 0) === 1;
  }
}
