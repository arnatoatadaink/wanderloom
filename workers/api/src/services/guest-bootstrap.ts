import type {
  PlayerCoreSnapshot,
  PlayerId,
  PlayerInventorySnapshot
} from "@wanderloom/game-core";

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
}

interface D1BatchDatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<readonly unknown[]>;
}

export interface GuestBootstrapResult {
  readonly playerId: PlayerId;
  readonly core: PlayerCoreSnapshot;
  readonly inventory: PlayerInventorySnapshot;
}

export async function bootstrapGuestPlayer(
  db: D1BatchDatabaseLike,
  input: {
    readonly playerId: PlayerId;
    readonly createdAt: string;
  }
): Promise<GuestBootstrapResult> {
  const core: PlayerCoreSnapshot = {
    schemaVersion: 1,
    stateVersion: 0,
    playerId: input.playerId,
    character: {
      stats: {}
    },
    progression: {
      level: 1,
      exp: 0,
      gold: 0
    },
    activeExploration: null,
    updatedAt: input.createdAt
  };

  const inventory: PlayerInventorySnapshot = {
    schemaVersion: 1,
    stateVersion: 0,
    playerId: input.playerId,
    equipment: {
      slots: {}
    },
    items: [],
    stackables: {
      quantities: {}
    },
    updatedAt: input.createdAt
  };

  await db.batch([
    db
      .prepare(
        `INSERT INTO players (player_id, created_at, updated_at)
         VALUES (?1, ?2, ?2)`
      )
      .bind(input.playerId, input.createdAt),
    db
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
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL, ?7, ?8)`
      )
      .bind(
        input.playerId,
        core.schemaVersion,
        core.stateVersion,
        core.progression.level,
        core.progression.exp,
        core.progression.gold,
        JSON.stringify(core),
        core.updatedAt
      ),
    db
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
        input.playerId,
        inventory.schemaVersion,
        inventory.stateVersion,
        JSON.stringify(inventory),
        inventory.updatedAt
      )
  ]);

  return {
    playerId: input.playerId,
    core,
    inventory
  };
}
