import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import {
  type ArchiveExportDeliveryResult,
  type ArchiveExportEnvelope,
  type ArchiveExportSink,
  type ExplorationArchiveEntry,
  type ExplorationId,
  type PlayerId,
  type ZoneId
} from "@wanderloom/game-core";
import {
  D1ArchiveExportRepository
} from "./persistence/d1-archive-export-repository";
import {
  syncPlayerArchive
} from "./services/sync-player-archive";
import type { ApiDatabase } from "./api";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

const playerId = "player-cp33" as PlayerId;
const explorationId = "exploration-cp33" as ExplorationId;

function archiveEntry(): ExplorationArchiveEntry {
  return {
    schemaVersion: 1,
    playerId,
    explorationId,
    zoneId: "m1-smoke-frontier" as ZoneId,
    durationId: "short",
    startedAt: "2026-09-25T01:00:00.000Z",
    endedAt: "2026-09-25T01:05:00.000Z",
    claimedAt: "2026-09-25T01:05:01.000Z",
    result: "success",
    rewards: {
      gold: 6,
      exp: 10,
      drops: []
    },
    summaryMetrics: {
      retainedGold: 6,
      retainedExp: 10
    },
    sync: {
      status: "pending",
      syncedAt: null
    }
  };
}

class SequenceSink implements ArchiveExportSink {
  readonly seen: ArchiveExportEnvelope[] = [];

  constructor(
    private readonly results: ArchiveExportDeliveryResult[]
  ) {}

  async deliver(
    envelope: ArchiveExportEnvelope
  ): Promise<ArchiveExportDeliveryResult> {
    this.seen.push(envelope);
    const next = this.results.shift();
    if (next === undefined) {
      throw new Error("unexpected archive delivery");
    }
    return next;
  }
}

describe("CP-33 archive sync with real D1", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    const db = env.DB as unknown as ApiDatabase;
    const entry = archiveEntry();

    await db
      .prepare(
        `INSERT INTO players (player_id, created_at, updated_at)
         VALUES (?1, ?2, ?2)`
      )
      .bind(playerId, entry.startedAt)
      .run();

    await db
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
         ) VALUES (
           ?1, ?2, ?3, ?4, ?5, ?6,
           ?7, ?8, ?9, 'pending', NULL, ?10
         )`
      )
      .bind(
        entry.playerId,
        entry.explorationId,
        entry.schemaVersion,
        entry.zoneId,
        entry.durationId,
        entry.startedAt,
        entry.endedAt,
        entry.claimedAt,
        entry.result,
        JSON.stringify(entry)
      )
      .run();
  });

  it("keeps gameplay archive pending after a retryable provider failure", async () => {
    const db = env.DB as unknown as ApiDatabase;
    const repository = new D1ArchiveExportRepository(db);
    const sink = new SequenceSink([
      {
        ok: false,
        retryable: true,
        code: "drive_create_http_503"
      }
    ]);

    const result = await syncPlayerArchive({
      playerId,
      repository,
      sink,
      now: () => "2026-09-25T01:06:00.000Z",
      limit: 10
    });

    expect(result).toEqual({
      attempted: 1,
      synced: 0,
      failed: 1,
      skippedNonRetryable: 0
    });

    const archive = await db
      .prepare(
        `SELECT sync_status, synced_at
         FROM recent_archive
         WHERE player_id = ?1 AND exploration_id = ?2`
      )
      .bind(playerId, explorationId)
      .first<{
        sync_status: string;
        synced_at: string | null;
      }>();

    expect(archive).toEqual({
      sync_status: "pending",
      synced_at: null
    });

    await expect(
      repository.findState(playerId, explorationId)
    ).resolves.toEqual({
      attemptCount: 1,
      lastAttemptAt: "2026-09-25T01:06:00.000Z",
      lastErrorCode: "drive_create_http_503",
      lastErrorRetryable: true,
      remoteId: null,
      syncedAt: null
    });
  });

  it("retries the pending archive and marks it synced only after confirmed delivery", async () => {
    const db = env.DB as unknown as ApiDatabase;
    const repository = new D1ArchiveExportRepository(db);
    const sink = new SequenceSink([
      {
        ok: true,
        disposition: "existing",
        remoteId: "drive-cp33-existing"
      }
    ]);

    const result = await syncPlayerArchive({
      playerId,
      repository,
      sink,
      now: () => "2026-09-25T01:07:00.000Z",
      limit: 10
    });

    expect(result).toEqual({
      attempted: 1,
      synced: 1,
      failed: 0,
      skippedNonRetryable: 0
    });

    const archive = await db
      .prepare(
        `SELECT sync_status, synced_at, archive_json
         FROM recent_archive
         WHERE player_id = ?1 AND exploration_id = ?2`
      )
      .bind(playerId, explorationId)
      .first<{
        sync_status: string;
        synced_at: string | null;
        archive_json: string;
      }>();

    expect(archive?.sync_status).toBe("synced");
    expect(archive?.synced_at).toBe("2026-09-25T01:07:00.000Z");
    expect(JSON.parse(archive?.archive_json ?? "{}")).toMatchObject({
      sync: {
        status: "synced",
        syncedAt: "2026-09-25T01:07:00.000Z"
      }
    });

    await expect(
      repository.findState(playerId, explorationId)
    ).resolves.toEqual({
      attemptCount: 2,
      lastAttemptAt: "2026-09-25T01:07:00.000Z",
      lastErrorCode: null,
      lastErrorRetryable: null,
      remoteId: "drive-cp33-existing",
      syncedAt: "2026-09-25T01:07:00.000Z"
    });

    await expect(repository.listPending(playerId, 10)).resolves.toEqual([]);
  });

  it("retries a 403 archive after Drive authorization is renewed", async () => {
    const db = env.DB as unknown as ApiDatabase;
    const repository = new D1ArchiveExportRepository(db);
    const entry = {
      ...archiveEntry(),
      explorationId: "exploration-cp33-403" as ExplorationId
    };
    await db.prepare(
      `INSERT INTO recent_archive (
         player_id, exploration_id, schema_version, zone_id, duration_id,
         started_at, ended_at, claimed_at, result, sync_status, synced_at,
         archive_json
       ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'pending', NULL, ?10)`
    ).bind(
      entry.playerId, entry.explorationId, entry.schemaVersion,
      entry.zoneId, entry.durationId, entry.startedAt, entry.endedAt,
      entry.claimedAt, entry.result, JSON.stringify(entry)
    ).run();
    await repository.recordFailure({
      playerId,
      explorationId: entry.explorationId,
      attemptedAt: "2026-09-25T01:08:00.000Z",
      retryable: false,
      code: "drive_list_http_403_accessNotConfigured"
    });

    const sink = new SequenceSink([{
      ok: true,
      disposition: "created",
      remoteId: "drive-cp33-recovered"
    }]);
    const input = {
      playerId, repository, sink,
      now: () => "2026-09-25T01:09:00.000Z",
      limit: 10
    };
    await expect(syncPlayerArchive(input)).resolves.toMatchObject({
      attempted: 0,
      skippedNonRetryable: 1
    });
    await repository.retryAfterAuthorization(playerId);
    await expect(syncPlayerArchive(input)).resolves.toMatchObject({
      attempted: 1,
      synced: 1
    });
    await expect(repository.findState(playerId, entry.explorationId))
      .resolves.toMatchObject({
        attemptCount: 2,
        lastErrorCode: null,
        remoteId: "drive-cp33-recovered"
      });
  });
});
