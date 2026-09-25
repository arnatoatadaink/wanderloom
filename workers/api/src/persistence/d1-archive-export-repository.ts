import {
  createArchiveExportEnvelope,
  type ArchiveExportEnvelope,
  type ExplorationArchiveEntry,
  type ExplorationId,
  type PlayerId
} from "@wanderloom/game-core";

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

export interface D1ArchiveExportDatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<readonly unknown[]>;
}

interface PendingArchiveRow {
  archive_json: string;
}

interface ExportStateRow {
  attempt_count: number;
  last_attempt_at: string | null;
  last_error_code: string | null;
  last_error_retryable: number | null;
  remote_id: string | null;
  synced_at: string | null;
}

export interface ArchiveExportState {
  readonly attemptCount: number;
  readonly lastAttemptAt: string | null;
  readonly lastErrorCode: string | null;
  readonly lastErrorRetryable: boolean | null;
  readonly remoteId: string | null;
  readonly syncedAt: string | null;
}

export class D1ArchiveExportRepository {
  constructor(private readonly db: D1ArchiveExportDatabaseLike) {}

  async listPending(
    playerId: PlayerId,
    limit: number
  ): Promise<readonly ArchiveExportEnvelope[]> {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError("limit must be a positive integer");
    }

    const result = await this.db
      .prepare(
        `SELECT archive_json
         FROM recent_archive
         WHERE player_id = ?1
           AND sync_status = 'pending'
         ORDER BY claimed_at ASC
         LIMIT ?2`
      )
      .bind(playerId, limit)
      .all<PendingArchiveRow>();

    return (result.results ?? []).map((row) => {
      const entry = JSON.parse(row.archive_json) as ExplorationArchiveEntry;
      return createArchiveExportEnvelope(entry);
    });
  }

  async findState(
    playerId: PlayerId,
    explorationId: ExplorationId
  ): Promise<ArchiveExportState | null> {
    const row = await this.db
      .prepare(
        `SELECT attempt_count,
                last_attempt_at,
                last_error_code,
                last_error_retryable,
                remote_id,
                synced_at
         FROM archive_export_state
         WHERE player_id = ?1
           AND exploration_id = ?2
         LIMIT 1`
      )
      .bind(playerId, explorationId)
      .first<ExportStateRow>();

    if (row === null) return null;

    return {
      attemptCount: row.attempt_count,
      lastAttemptAt: row.last_attempt_at,
      lastErrorCode: row.last_error_code,
      lastErrorRetryable:
        row.last_error_retryable === null
          ? null
          : row.last_error_retryable === 1,
      remoteId: row.remote_id,
      syncedAt: row.synced_at
    };
  }

  async retryAfterAuthorization(playerId: PlayerId): Promise<void> {
    await this.db
      .prepare(
        `UPDATE archive_export_state
         SET last_error_retryable = 1
         WHERE player_id = ?1
           AND remote_id IS NULL
           AND last_error_retryable = 0
           AND last_error_code LIKE 'drive_%_http_403%'`
      )
      .bind(playerId)
      .run();
  }

  async recordFailure(input: {
    readonly playerId: PlayerId;
    readonly explorationId: ExplorationId;
    readonly attemptedAt: string;
    readonly retryable: boolean;
    readonly code: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO archive_export_state (
           player_id,
           exploration_id,
           attempt_count,
           last_attempt_at,
           last_error_code,
           last_error_retryable,
           remote_id,
           synced_at
         )
         VALUES (?1, ?2, 1, ?3, ?4, ?5, NULL, NULL)
         ON CONFLICT(player_id, exploration_id) DO UPDATE SET
           attempt_count = archive_export_state.attempt_count + 1,
           last_attempt_at = excluded.last_attempt_at,
           last_error_code = excluded.last_error_code,
           last_error_retryable = excluded.last_error_retryable
         WHERE archive_export_state.remote_id IS NULL`
      )
      .bind(
        input.playerId,
        input.explorationId,
        input.attemptedAt,
        input.code,
        input.retryable ? 1 : 0
      )
      .run();
  }

  async recordSuccess(input: {
    readonly playerId: PlayerId;
    readonly explorationId: ExplorationId;
    readonly syncedAt: string;
    readonly remoteId: string;
  }): Promise<void> {
    const recordState = this.db
      .prepare(
        `INSERT INTO archive_export_state (
           player_id,
           exploration_id,
           attempt_count,
           last_attempt_at,
           last_error_code,
           last_error_retryable,
           remote_id,
           synced_at
         )
         VALUES (?1, ?2, 1, ?3, NULL, NULL, ?4, ?3)
         ON CONFLICT(player_id, exploration_id) DO UPDATE SET
           attempt_count = archive_export_state.attempt_count + 1,
           last_attempt_at = excluded.last_attempt_at,
           last_error_code = NULL,
           last_error_retryable = NULL,
           remote_id = CASE
             WHEN archive_export_state.remote_id IS NULL
               THEN excluded.remote_id
             ELSE archive_export_state.remote_id
           END,
           synced_at = CASE
             WHEN archive_export_state.synced_at IS NULL
               THEN excluded.synced_at
             ELSE archive_export_state.synced_at
           END`
      )
      .bind(
        input.playerId,
        input.explorationId,
        input.syncedAt,
        input.remoteId
      );

    const markArchiveSynced = this.db
      .prepare(
        `UPDATE recent_archive
         SET sync_status = 'synced',
             synced_at = COALESCE(synced_at, ?3),
             archive_json = json_set(
               archive_json,
               '$.sync.status',
               'synced',
               '$.sync.syncedAt',
               COALESCE(synced_at, ?3)
             )
         WHERE player_id = ?1
           AND exploration_id = ?2
           AND sync_status IN ('pending', 'synced')`
      )
      .bind(input.playerId, input.explorationId, input.syncedAt);

    // D1 batch gives one transactional boundary for export-state and
    // recent-archive acknowledgement. A partial success cannot leave a
    // remote_id recorded while the archive remains pending.
    await this.db.batch([recordState, markArchiveSynced]);
  }
}
