import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import type {
  ExplorationId,
  ItemInstanceId,
  PlayerId
} from "@wanderloom/game-core";
import {
  createApi,
  type ApiDatabase,
  type ApiRuntime
} from "./api";
import type { GoogleIdTokenVerifier } from "./google-oidc";
import { D1ArchiveExportRepository } from "./persistence/d1-archive-export-repository";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

class FixedGoogleVerifier implements GoogleIdTokenVerifier {
  async verify(): Promise<{ readonly subject: string }> {
    return { subject: "google-sub:cp34-race" };
  }
}

let playerSequence = 0;

const runtime: ApiRuntime = {
  now: () => "2026-09-25T14:00:00.000Z",
  createPlayerId: () => {
    playerSequence += 1;
    return `player-cp34-${playerSequence}` as PlayerId;
  },
  createExplorationId: () => "unused-exploration" as ExplorationId,
  createClaimNonce: () => "unused-nonce",
  createSeed: () => "unused-seed",
  createItemInstanceId: () => "unused-item" as ItemInstanceId,
  resolveDurationMs: () => null,
  resolveExploration: () => null,
  recentArchiveRetention: 3,
  googleIdTokenVerifier: new FixedGoogleVerifier()
};

async function bootstrap(api: ReturnType<typeof createApi>): Promise<PlayerId> {
  const response = await api.fetch(
    new Request("https://example.test/api/guest/bootstrap", {
      method: "POST"
    }),
    {
      DB: env.DB as unknown as ApiDatabase,
      GOOGLE_CLIENT_ID: "google-client-test"
    }
  );
  const body = (await response.json()) as { readonly playerId: PlayerId };
  return body.playerId;
}

function linkRequest(playerId: PlayerId): Request {
  return new Request("https://example.test/api/auth/google/link", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-wanderloom-player-id": playerId
    },
    body: JSON.stringify({ credential: "same-google-credential" })
  });
}

describe("CP-34 persistence and identity concurrency", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("allows one owner when two players concurrently link the same Google subject", async () => {
    const api = createApi(runtime);
    const [firstPlayer, secondPlayer] = await Promise.all([
      bootstrap(api),
      bootstrap(api)
    ]);

    const [first, second] = await Promise.all([
      api.fetch(linkRequest(firstPlayer), {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }),
      api.fetch(linkRequest(secondPlayer), {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      })
    ]);

    const responses = [first, second];
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);

    const conflict = responses.find((response) => response.status === 409);
    await expect(conflict?.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "external_identity_conflict"
      }
    });

    const rows = await env.DB
      .prepare(
        `SELECT player_id
         FROM external_identity_links
         WHERE provider = 'google'
           AND subject = 'google-sub:cp34-race'`
      )
      .all<{ player_id: string }>();

    expect(rows.results).toHaveLength(1);
    expect([firstPlayer, secondPlayer]).toContain(rows.results[0]?.player_id);
  });

  it("keeps one stable archive acknowledgement under concurrent success recording", async () => {
    const db = env.DB as unknown as ApiDatabase;
    const playerId = "player-cp34-archive" as PlayerId;
    const explorationId = "exploration-cp34-archive" as ExplorationId;
    const archive = {
      schemaVersion: 1,
      playerId,
      explorationId,
      zoneId: "m1-smoke-frontier",
      durationId: "short",
      startedAt: "2026-09-25T14:00:00.000Z",
      endedAt: "2026-09-25T14:05:00.000Z",
      claimedAt: "2026-09-25T14:05:01.000Z",
      result: "success",
      rewards: { gold: 5, exp: 10, drops: [] },
      summaryMetrics: {},
      sync: { status: "pending", syncedAt: null }
    };

    await db.prepare(
      `INSERT INTO players (player_id, created_at, updated_at)
       VALUES (?1, ?2, ?2)`
    ).bind(playerId, archive.startedAt).run();

    await db.prepare(
      `INSERT INTO recent_archive (
         player_id, exploration_id, schema_version, zone_id, duration_id,
         started_at, ended_at, claimed_at, result, sync_status, synced_at,
         archive_json
       ) VALUES (?1, ?2, 1, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', NULL, ?9)`
    ).bind(
      playerId,
      explorationId,
      archive.zoneId,
      archive.durationId,
      archive.startedAt,
      archive.endedAt,
      archive.claimedAt,
      archive.result,
      JSON.stringify(archive)
    ).run();

    const repository = new D1ArchiveExportRepository(db);

    await Promise.all([
      repository.recordSuccess({
        playerId,
        explorationId,
        syncedAt: "2026-09-25T14:06:00.000Z",
        remoteId: "remote-first"
      }),
      repository.recordSuccess({
        playerId,
        explorationId,
        syncedAt: "2026-09-25T14:06:01.000Z",
        remoteId: "remote-second"
      })
    ]);

    const state = await repository.findState(playerId, explorationId);
    expect(state?.attemptCount).toBe(2);
    expect(["remote-first", "remote-second"]).toContain(state?.remoteId);
    expect([
      "2026-09-25T14:06:00.000Z",
      "2026-09-25T14:06:01.000Z"
    ]).toContain(state?.syncedAt);

    const row = await db.prepare(
      `SELECT sync_status, synced_at, archive_json
       FROM recent_archive
       WHERE player_id = ?1 AND exploration_id = ?2`
    ).bind(playerId, explorationId).first<{
      sync_status: string;
      synced_at: string | null;
      archive_json: string;
    }>();

    expect(row?.sync_status).toBe("synced");
    expect(row?.synced_at).toBe(state?.syncedAt);
    expect(JSON.parse(row?.archive_json ?? "{}")).toMatchObject({
      sync: {
        status: "synced",
        syncedAt: state?.syncedAt
      }
    });
  });
});
