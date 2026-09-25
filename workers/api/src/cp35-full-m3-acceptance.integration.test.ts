import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import type {
  ArchiveExportSink,
  ExplorationId,
  ItemDefinitionId,
  ItemInstanceId,
  PlayerId,
  ZoneId
} from "@wanderloom/game-core";
import {
  createApi,
  type ApiDatabase,
  type ApiRuntime
} from "./api";
import type { GoogleIdTokenVerifier } from "./google-oidc";
import { D1ArchiveExportRepository } from "./persistence/d1-archive-export-repository";
import { syncPlayerArchive } from "./services/sync-player-archive";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

const playerId = "player-cp35-full-m3" as PlayerId;
const zoneId = "m1-smoke-frontier" as ZoneId;
let now = "2026-09-26T00:00:00.000Z";
let explorationSequence = 0;

class Cp35GoogleVerifier implements GoogleIdTokenVerifier {
  async verify(
    credential: string,
    expectedAudience: string
  ): Promise<{ readonly subject: string }> {
    expect(expectedAudience).toBe("google-client-cp35");
    expect(credential).toBe("google-credential-cp35");
    return { subject: "google-sub:cp35" };
  }
}

const runtime: ApiRuntime = {
  now: () => now,
  createPlayerId: () => playerId,
  createExplorationId: () => {
    explorationSequence += 1;
    return `exploration-cp35-${explorationSequence}` as ExplorationId;
  },
  createClaimNonce: () => `nonce-cp35-${explorationSequence}`,
  createSeed: () => `seed-cp35-${explorationSequence}`,
  createItemInstanceId: () => "item-cp35-rare" as ItemInstanceId,
  resolveDurationMs: (_zoneId, durationId) =>
    durationId === "short" ? 300_000 : durationId === "long" ? 600_000 : null,
  resolveExploration: (_exploration, claimedAt) => ({
    result: "success",
    gold: 6,
    exp: 10,
    drops: [{
      itemInstanceId: "item-cp35-rare" as ItemInstanceId,
      itemDefinitionId: "m2-wayfarer-charm-rare" as ItemDefinitionId,
      rarity: "Rare",
      createdAt: claimedAt
    }],
    summaryMetrics: {
      generatedGold: 6,
      generatedExp: 10,
      retainedGold: 6,
      retainedExp: 10,
      lostGold: 0,
      lostExp: 0,
      generatedDropCount: 1,
      retainedDropCount: 1
    }
  }),
  recentArchiveRetention: 3,
  progressionRule: {
    maxLevel: 20,
    expRequiredForLevel: () => 100
  },
  equipmentEffectDefinitions: [{
    itemDefinitionId: "m2-wayfarer-charm-rare" as ItemDefinitionId,
    statModifiers: { power: 2, luck: 1 }
  }],
  googleIdTokenVerifier: new Cp35GoogleVerifier()
};

function playerRequest(
  path: string,
  init: RequestInit = {}
): Request {
  const headers = new Headers(init.headers);
  headers.set("x-wanderloom-player-id", playerId);
  return new Request(`https://example.test${path}`, {
    ...init,
    headers
  });
}

describe("CP-35 full M3 acceptance with real D1", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("preserves one player across guest, Google restore, gameplay, and archive sync", async () => {
    const db = env.DB as unknown as ApiDatabase;
    const api = createApi(runtime);

    const bootstrap = await api.fetch(
      new Request("https://example.test/api/guest/bootstrap", {
        method: "POST"
      }),
      {
        DB: db,
        GOOGLE_CLIENT_ID: "google-client-cp35"
      }
    );
    expect(bootstrap.status).toBe(201);
    await expect(bootstrap.clone().json()).resolves.toMatchObject({
      ok: true,
      playerId
    });

    const link = await api.fetch(
      playerRequest("/api/auth/google/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          credential: "google-credential-cp35"
        })
      }),
      {
        DB: db,
        GOOGLE_CLIENT_ID: "google-client-cp35"
      }
    );
    expect(link.status).toBe(200);
    await expect(link.clone().json()).resolves.toMatchObject({
      ok: true,
      accountLink: {
        status: "linked",
        provider: "google",
        subject: "google-sub:cp35"
      }
    });

    const restore = await api.fetch(
      new Request("https://example.test/api/auth/google/restore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          credential: "google-credential-cp35"
        })
      }),
      {
        DB: db,
        GOOGLE_CLIENT_ID: "google-client-cp35"
      }
    );
    expect(restore.status).toBe(200);
    await expect(restore.clone().json()).resolves.toMatchObject({
      ok: true,
      playerId,
      core: { playerId },
      inventory: { playerId }
    });

    const start = await api.fetch(
      playerRequest("/api/explorations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          zoneId,
          durationId: "short"
        })
      }),
      { DB: db }
    );
    expect(start.status).toBe(201);

    now = "2026-09-26T00:05:01.000Z";
    const explorationId = "exploration-cp35-1" as ExplorationId;
    const claim = await api.fetch(
      playerRequest(
        `/api/explorations/${explorationId}/claim`,
        { method: "POST" }
      ),
      { DB: db }
    );
    expect(claim.status).toBe(200);
    await expect(claim.clone().json()).resolves.toMatchObject({
      ok: true,
      core: {
        playerId,
        progression: {
          gold: 6,
          exp: 10
        }
      },
      archiveEntry: {
        playerId,
        explorationId,
        sync: {
          status: "pending",
          syncedAt: null
        }
      }
    });

    const pending = await db.prepare(
      `SELECT sync_status, synced_at
       FROM recent_archive
       WHERE player_id = ?1
         AND exploration_id = ?2`
    ).bind(playerId, explorationId).first<{
      sync_status: string;
      synced_at: string | null;
    }>();
    expect(pending).toEqual({
      sync_status: "pending",
      synced_at: null
    });

    let deliveredArchiveId: string | null = null;
    const sink: ArchiveExportSink = {
      async deliver(envelope) {
        deliveredArchiveId = envelope.archiveId;
        return {
          ok: true,
          disposition: "created",
          remoteId: "drive-cp35"
        };
      }
    };

    now = "2026-09-26T00:06:00.000Z";
    const repository = new D1ArchiveExportRepository(db);
    await expect(syncPlayerArchive({
      playerId,
      repository,
      sink,
      now: () => now,
      limit: 10
    })).resolves.toEqual({
      attempted: 1,
      synced: 1,
      failed: 0,
      skippedNonRetryable: 0
    });

    expect(deliveredArchiveId).toBe(
      `exploration:${playerId}:${explorationId}`
    );

    await expect(repository.findState(playerId, explorationId))
      .resolves.toMatchObject({
        attemptCount: 1,
        lastErrorCode: null,
        remoteId: "drive-cp35",
        syncedAt: "2026-09-26T00:06:00.000Z",
        deliveryLeaseToken: null,
        deliveryLeaseUntil: null
      });

    const synced = await db.prepare(
      `SELECT sync_status, synced_at
       FROM recent_archive
       WHERE player_id = ?1
         AND exploration_id = ?2`
    ).bind(playerId, explorationId).first<{
      sync_status: string;
      synced_at: string | null;
    }>();
    expect(synced).toEqual({
      sync_status: "synced",
      synced_at: "2026-09-26T00:06:00.000Z"
    });

    const identity = await db.prepare(
      `SELECT player_id
       FROM external_identity_links
       WHERE provider = 'google'
         AND subject = 'google-sub:cp35'`
    ).first<{ player_id: string }>();
    expect(identity?.player_id).toBe(playerId);

    const tables = await db.prepare(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table'
         AND name IN (
           'players',
           'external_identity_links',
           'recent_archive',
           'archive_export_state',
           'google_drive_authorizations'
         )
       ORDER BY name`
    ).all<{ name: string }>();
    expect((tables.results ?? []).map((row) => row.name)).toEqual([
      "archive_export_state",
      "external_identity_links",
      "google_drive_authorizations",
      "players",
      "recent_archive"
    ]);

    const leaseColumns = await db.prepare(
      `SELECT name
       FROM pragma_table_info('archive_export_state')
       WHERE name IN ('delivery_lease_token', 'delivery_lease_until')
       ORDER BY name`
    ).all<{ name: string }>();
    expect((leaseColumns.results ?? []).map((row) => row.name)).toEqual([
      "delivery_lease_token",
      "delivery_lease_until"
    ]);
  });
});
