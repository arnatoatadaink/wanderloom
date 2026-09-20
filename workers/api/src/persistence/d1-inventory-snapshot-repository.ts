import type {
  InventorySnapshotRepository,
  PlayerId,
  PlayerInventorySnapshot
} from "@wanderloom/game-core";
import type { D1DatabaseLike } from "./d1-core-snapshot-repository";

interface InventoryRow {
  snapshot_json: string;
}

export class D1InventorySnapshotRepository
  implements InventorySnapshotRepository
{
  constructor(private readonly db: D1DatabaseLike) {}

  async findByPlayerId(
    playerId: PlayerId
  ): Promise<PlayerInventorySnapshot | null> {
    const row = await this.db
      .prepare(
        "SELECT snapshot_json FROM player_inventory WHERE player_id = ?1 LIMIT 1"
      )
      .bind(playerId)
      .first<InventoryRow>();

    return row === null
      ? null
      : (JSON.parse(row.snapshot_json) as PlayerInventorySnapshot);
  }

  async insert(snapshot: PlayerInventorySnapshot): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO player_inventory (
          player_id,
          schema_version,
          state_version,
          snapshot_json,
          updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5)`
      )
      .bind(
        snapshot.playerId,
        snapshot.schemaVersion,
        snapshot.stateVersion,
        JSON.stringify(snapshot),
        snapshot.updatedAt
      )
      .run();
  }

  async updateIfVersionMatches(
    snapshot: PlayerInventorySnapshot,
    expectedStateVersion: number
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `UPDATE player_inventory
         SET schema_version = ?2,
             state_version = ?3,
             snapshot_json = ?4,
             updated_at = ?5
         WHERE player_id = ?1
           AND state_version = ?6`
      )
      .bind(
        snapshot.playerId,
        snapshot.schemaVersion,
        snapshot.stateVersion,
        JSON.stringify(snapshot),
        snapshot.updatedAt,
        expectedStateVersion
      )
      .run();

    return (result.meta?.changes ?? 0) === 1;
  }
}
