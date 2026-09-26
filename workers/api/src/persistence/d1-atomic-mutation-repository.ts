import {
  deriveExplorationState,
  type AlreadyClaimed,
  type AtomicMutationCommit,
  type AtomicMutationRepository,
  type ClaimAtomicMutation,
  type InvalidExplorationState,
  type InventoryOnlyAtomicMutation,
  type MutationResult,
  type PlayerCoreSnapshot,
  type VersionConflict
} from "@wanderloom/game-core";

interface D1ResultLike {
  readonly success?: boolean;
  readonly meta?: {
    readonly changes?: number;
  };
}

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T>(): Promise<T | null>;
}

export interface D1AtomicDatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<readonly D1ResultLike[]>;
}

interface ClaimedRow {
  claimed_at: string;
}

interface CoreConflictRow {
  state_version: number;
  snapshot_json: string;
}

interface InventoryConflictRow {
  state_version: number;
}

export interface D1AtomicMutationRepositoryOptions {
  readonly recentArchiveRetention: number;
  readonly guardTokenFactory?: () => string;
}

export class D1AtomicMutationRepository implements AtomicMutationRepository {
  private readonly guardTokenFactory: () => string;

  constructor(
    private readonly db: D1AtomicDatabaseLike,
    private readonly options: D1AtomicMutationRepositoryOptions
  ) {
    if (!Number.isInteger(options.recentArchiveRetention) || options.recentArchiveRetention < 1) {
      throw new RangeError("recentArchiveRetention must be a positive integer");
    }

    this.guardTokenFactory =
      options.guardTokenFactory ?? (() => crypto.randomUUID());
  }

  async commit(
    mutation: Parameters<AtomicMutationRepository["commit"]>[0]
  ): ReturnType<AtomicMutationRepository["commit"]> {
    if (mutation.kind === "inventory") {
      return this.commitInventory(mutation);
    }
    if (mutation.kind === "claim") {
      return this.commitClaim(mutation);
    }
    throw new Error(`unsupported atomic mutation kind: ${mutation.kind}`);
  }

  private async commitInventory(
    mutation: InventoryOnlyAtomicMutation
  ): Promise<MutationResult<AtomicMutationCommit>> {
    const update = this.db
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
        mutation.playerId,
        mutation.nextInventory.schemaVersion,
        mutation.nextInventory.stateVersion,
        JSON.stringify(mutation.nextInventory),
        mutation.nextInventory.updatedAt,
        mutation.expectedInventoryStateVersion
      );

    const [result] = await this.db.batch([update]);
    if ((result?.meta?.changes ?? 0) !== 1) {
      const inventory = await this.db
        .prepare(
          `SELECT state_version
           FROM player_inventory
           WHERE player_id = ?1
           LIMIT 1`
        )
        .bind(mutation.playerId)
        .first<InventoryConflictRow>();
      if (inventory === null) throw new Error("inventory snapshot missing");
      return {
        ok: false,
        error: {
          code: "version_conflict",
          snapshot: "inventory",
          expectedVersion: mutation.expectedInventoryStateVersion,
          actualVersion: inventory.state_version
        }
      };
    }

    return {
      ok: true,
      value: {
        coreStateVersion: null,
        inventoryStateVersion: mutation.nextInventory.stateVersion,
        explorationId: null
      }
    };
  }

  private async commitClaim(
    mutation: ClaimAtomicMutation
  ): Promise<MutationResult<AtomicMutationCommit>> {
    const guardToken = this.guardTokenFactory();
    const guard = this.db
      .prepare(
        `INSERT INTO player_mutation_guards (
           player_id,
           guard_token,
           claim_nonce,
           acquired_at
         )
         SELECT ?1, ?2, ?3, ?4
         WHERE EXISTS (
           SELECT 1
           FROM player_core
           WHERE player_id = ?1
             AND state_version = ?5
             AND active_exploration_id = ?6
             AND active_claim_nonce = ?3
         )
         AND EXISTS (
           SELECT 1
           FROM player_inventory
           WHERE player_id = ?1
             AND state_version = ?7
         )`
      )
      .bind(
        mutation.playerId,
        guardToken,
        mutation.claimNonce,
        mutation.archiveEntry.claimedAt,
        mutation.expectedCoreStateVersion,
        mutation.archiveEntry.explorationId,
        mutation.expectedInventoryStateVersion
      );

    const updateCore = this.db
      .prepare(
        `UPDATE player_core
         SET schema_version = ?2,
             state_version = ?3,
             level = ?4,
             exp = ?5,
             gold = ?6,
             active_exploration_id = NULL,
             active_claim_nonce = NULL,
             snapshot_json = ?7,
             updated_at = ?8
         WHERE player_id = ?1
           AND state_version = ?9
           AND EXISTS (
             SELECT 1
             FROM player_mutation_guards
             WHERE player_id = ?1
               AND guard_token = ?10
           )`
      )
      .bind(
        mutation.playerId,
        mutation.nextCore.schemaVersion,
        mutation.nextCore.stateVersion,
        mutation.nextCore.progression.level,
        mutation.nextCore.progression.exp,
        mutation.nextCore.progression.gold,
        JSON.stringify(mutation.nextCore),
        mutation.nextCore.updatedAt,
        mutation.expectedCoreStateVersion,
        guardToken
      );

    const updateInventory = this.db
      .prepare(
        `UPDATE player_inventory
         SET schema_version = ?2,
             state_version = ?3,
             snapshot_json = ?4,
             updated_at = ?5
         WHERE player_id = ?1
           AND state_version = ?6
           AND EXISTS (
             SELECT 1
             FROM player_mutation_guards
             WHERE player_id = ?1
               AND guard_token = ?7
           )`
      )
      .bind(
        mutation.playerId,
        mutation.nextInventory.schemaVersion,
        mutation.nextInventory.stateVersion,
        JSON.stringify(mutation.nextInventory),
        mutation.nextInventory.updatedAt,
        mutation.expectedInventoryStateVersion,
        guardToken
      );

    const insertArchive = this.db
      .prepare(
        `INSERT INTO recent_archive (
           player_id,
           exploration_id,
           schema_version,
           zone_id,
           duration_id,
           started_at,
           ended_at,
           claimed_at,
           result,
           sync_status,
           synced_at,
           archive_json
         )
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12
         WHERE EXISTS (
           SELECT 1
           FROM player_mutation_guards
           WHERE player_id = ?1
             AND guard_token = ?13
         )`
      )
      .bind(
        mutation.playerId,
        mutation.archiveEntry.explorationId,
        mutation.archiveEntry.schemaVersion,
        mutation.archiveEntry.zoneId,
        mutation.archiveEntry.durationId,
        mutation.archiveEntry.startedAt,
        mutation.archiveEntry.endedAt,
        mutation.archiveEntry.claimedAt,
        mutation.archiveEntry.result,
        mutation.archiveEntry.sync.status,
        mutation.archiveEntry.sync.syncedAt,
        JSON.stringify(mutation.archiveEntry),
        guardToken
      );

    const pruneArchive = this.db
      .prepare(
        `DELETE FROM recent_archive
         WHERE player_id = ?1
           AND sync_status = 'synced'
           AND exploration_id IN (
             SELECT exploration_id
             FROM recent_archive
             WHERE player_id = ?1
               AND sync_status = 'synced'
             ORDER BY claimed_at DESC
             LIMIT -1 OFFSET ?2
           )
           AND EXISTS (
             SELECT 1
             FROM player_mutation_guards
             WHERE player_id = ?1
               AND guard_token = ?3
           )`
      )
      .bind(
        mutation.playerId,
        this.options.recentArchiveRetention,
        guardToken
      );

    const releaseGuard = this.db
      .prepare(
        `DELETE FROM player_mutation_guards
         WHERE player_id = ?1
           AND guard_token = ?2`
      )
      .bind(mutation.playerId, guardToken);

    const results = await this.db.batch([
      guard,
      updateCore,
      updateInventory,
      insertArchive,
      pruneArchive,
      releaseGuard
    ]);

    const acquired = (results[0]?.meta?.changes ?? 0) === 1;
    if (!acquired) {
      return this.classifyClaimConflict(mutation);
    }

    if (
      (results[1]?.meta?.changes ?? 0) !== 1 ||
      (results[2]?.meta?.changes ?? 0) !== 1 ||
      (results[3]?.meta?.changes ?? 0) !== 1
    ) {
      throw new Error("atomic claim invariant violated after mutation guard acquisition");
    }

    return {
      ok: true,
      value: {
        coreStateVersion: mutation.nextCore.stateVersion,
        inventoryStateVersion: mutation.nextInventory.stateVersion,
        explorationId: mutation.archiveEntry.explorationId
      }
    };
  }

  private async classifyClaimConflict(
    mutation: ClaimAtomicMutation
  ): Promise<
    MutationResult<
      never,
      AlreadyClaimed | VersionConflict | InvalidExplorationState
    >
  > {
    const claimed = await this.db
      .prepare(
        `SELECT claimed_at
         FROM recent_archive
         WHERE player_id = ?1
           AND exploration_id = ?2
         LIMIT 1`
      )
      .bind(mutation.playerId, mutation.archiveEntry.explorationId)
      .first<ClaimedRow>();

    if (claimed !== null) {
      return {
        ok: false,
        error: {
          code: "already_claimed",
          explorationId: mutation.archiveEntry.explorationId,
          claimedAt: claimed.claimed_at
        }
      };
    }

    const core = await this.db
      .prepare(
        `SELECT state_version, snapshot_json
         FROM player_core
         WHERE player_id = ?1
         LIMIT 1`
      )
      .bind(mutation.playerId)
      .first<CoreConflictRow>();

    if (core === null) {
      throw new Error("core snapshot missing while classifying claim conflict");
    }

    if (core.state_version !== mutation.expectedCoreStateVersion) {
      return {
        ok: false,
        error: {
          code: "version_conflict",
          snapshot: "core",
          expectedVersion: mutation.expectedCoreStateVersion,
          actualVersion: core.state_version
        }
      };
    }

    const inventory = await this.db
      .prepare(
        `SELECT state_version
         FROM player_inventory
         WHERE player_id = ?1
         LIMIT 1`
      )
      .bind(mutation.playerId)
      .first<InventoryConflictRow>();

    if (inventory === null) {
      throw new Error("inventory snapshot missing while classifying claim conflict");
    }

    if (inventory.state_version !== mutation.expectedInventoryStateVersion) {
      return {
        ok: false,
        error: {
          code: "version_conflict",
          snapshot: "inventory",
          expectedVersion: mutation.expectedInventoryStateVersion,
          actualVersion: inventory.state_version
        }
      };
    }

    const currentCore = JSON.parse(core.snapshot_json) as PlayerCoreSnapshot;
    const actualState = deriveExplorationState(
      currentCore.activeExploration,
      mutation.archiveEntry.claimedAt
    );

    return {
      ok: false,
      error: {
        code: "invalid_exploration_state",
        explorationId: mutation.archiveEntry.explorationId,
        actualState,
        allowedStates: ["ready_to_claim"]
      }
    };
  }
}
