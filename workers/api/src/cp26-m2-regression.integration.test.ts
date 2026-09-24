import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import {
  type ExplorationId,
  type ItemInstanceId,
  type PlayerId,
  type ZoneRewardConfiguration,
  type ZoneId
} from "@wanderloom/game-core";
import {
  createApi,
  type ApiDatabase,
  type ApiRuntime
} from "./api";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

const zoneId = "m1-smoke-frontier" as ZoneId;

function request(playerId: PlayerId, path: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("x-wanderloom-player-id", playerId);
  return new Request(`https://example.test${path}`, {
    ...init,
    headers
  });
}

describe("CP-26 M2 migration and concurrency regression", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("round-trips the CP-23 frozen exploration snapshot through real D1", async () => {
    const playerId = "player-cp26-roundtrip" as PlayerId;
    const explorationId = "exploration-cp26-roundtrip" as ExplorationId;
    const rewardConfiguration: ZoneRewardConfiguration = {
      zoneId,
      drops: [],
      durations: [{ durationId: "short", dropCount: 0 }]
    };

    const runtime: ApiRuntime = {
      now: () => "2026-09-24T00:00:00.000Z",
      createPlayerId: () => playerId,
      createExplorationId: () => explorationId,
      createClaimNonce: () => "cp26-roundtrip-nonce",
      createSeed: () => "cp26-roundtrip-seed",
      createItemInstanceId: () => "unused-item" as ItemInstanceId,
      resolveDurationMs: (_zoneId, durationId) =>
        durationId === "short" ? 300_000 : null,
      resolveExploration: () => null,
      recentArchiveRetention: 3,
      rewardConfiguration
    };

    const api = createApi(runtime);
    const db = env.DB as unknown as ApiDatabase;

    const bootstrap = await api.fetch(
      new Request("https://example.test/api/guest/bootstrap", { method: "POST" }),
      { DB: db }
    );
    expect(bootstrap.status).toBe(201);

    const start = await api.fetch(
      request(playerId, "/api/explorations", {
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

    const current = await api.fetch(
      request(playerId, "/api/explorations/current"),
      { DB: db }
    );
    expect(current.status).toBe(200);
    await expect(current.json()).resolves.toMatchObject({
      ok: true,
      exploration: {
        explorationId,
        zoneId,
        durationId: "short",
        characterSnapshot: {
          stats: {},
          baseStats: {},
          equipmentEffects: []
        }
      }
    });
  });

  it("atomically persists an M2 failure claim with progression and rejects the retry", async () => {
    const playerId = "player-cp26-failure" as PlayerId;
    const explorationId = "exploration-cp26-failure" as ExplorationId;
    let now = "2026-09-24T00:00:00.000Z";

    const runtime: ApiRuntime = {
      now: () => now,
      createPlayerId: () => playerId,
      createExplorationId: () => explorationId,
      createClaimNonce: () => "cp26-failure-nonce",
      createSeed: () => "cp26-failure-seed",
      createItemInstanceId: () => "unused-item" as ItemInstanceId,
      resolveDurationMs: (_zoneId, durationId) =>
        durationId === "short" ? 300_000 : null,
      resolveExploration: () => ({
        result: "failure",
        gold: 3,
        exp: 15,
        drops: [],
        summaryMetrics: {
          generatedGold: 6,
          generatedExp: 30,
          retainedGold: 3,
          retainedExp: 15,
          lostGold: 3,
          lostExp: 15,
          generatedDropCount: 1,
          retainedDropCount: 0
        }
      }),
      recentArchiveRetention: 3,
      progressionRule: {
        maxLevel: 20,
        expRequiredForLevel: () => 10
      }
    };

    const api = createApi(runtime);
    const db = env.DB as unknown as ApiDatabase;

    const bootstrap = await api.fetch(
      new Request("https://example.test/api/guest/bootstrap", { method: "POST" }),
      { DB: db }
    );
    expect(bootstrap.status).toBe(201);

    const start = await api.fetch(
      request(playerId, "/api/explorations", {
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

    now = "2026-09-24T00:05:01.000Z";

    const claim = await api.fetch(
      request(playerId, `/api/explorations/${explorationId}/claim`, {
        method: "POST"
      }),
      { DB: db }
    );
    expect(claim.status).toBe(200);
    await expect(claim.clone().json()).resolves.toMatchObject({
      ok: true,
      core: {
        stateVersion: 2,
        progression: {
          level: 2,
          exp: 5,
          gold: 3
        },
        activeExploration: null
      },
      inventory: {
        stateVersion: 1,
        items: []
      },
      archiveEntry: {
        result: "failure",
        rewards: {
          gold: 3,
          exp: 15,
          drops: []
        },
        summaryMetrics: {
          generatedGold: 6,
          generatedExp: 30,
          retainedGold: 3,
          retainedExp: 15,
          lostGold: 3,
          lostExp: 15,
          generatedDropCount: 1,
          retainedDropCount: 0
        }
      }
    });

    const retry = await api.fetch(
      request(playerId, `/api/explorations/${explorationId}/claim`, {
        method: "POST"
      }),
      { DB: db }
    );
    expect(retry.status).toBe(409);
    await expect(retry.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "already_claimed",
        explorationId
      }
    });

    const state = await api.fetch(request(playerId, "/api/state"), { DB: db });
    await expect(state.json()).resolves.toMatchObject({
      ok: true,
      core: {
        stateVersion: 2,
        progression: {
          level: 2,
          exp: 5,
          gold: 3
        },
        activeExploration: null
      }
    });

    const archive = await db
      .prepare(
        `SELECT result, archive_json
         FROM recent_archive
         WHERE player_id = ?1
           AND exploration_id = ?2`
      )
      .bind(playerId, explorationId)
      .first<{ result: string; archive_json: string }>();

    expect(archive?.result).toBe("failure");
    expect(JSON.parse(archive?.archive_json ?? "{}")).toMatchObject({
      result: "failure",
      rewards: {
        gold: 3,
        exp: 15,
        drops: []
      }
    });
  });
});
