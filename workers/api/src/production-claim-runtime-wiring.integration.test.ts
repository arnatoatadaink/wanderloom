import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import type {
  ExplorationId,
  ItemInstanceId,
  PlayerId,
  ProgressionRule,
  ZoneId
} from "@wanderloom/game-core";
import { createApi, type ApiDatabase, type ApiRuntime } from "./api";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

const playerId = "player-production-routing" as PlayerId;
const explorationId = "exploration-production-routing" as ExplorationId;
let nowValue = "2026-10-03T06:00:00.000Z";

const fallbackRule: ProgressionRule = {
  maxLevel: 20,
  expRequiredForLevel: () => 100
};

const selectedRule: ProgressionRule = {
  maxLevel: 2,
  expRequiredForLevel: () => 30
};

const runtime: ApiRuntime = {
  now: () => nowValue,
  createPlayerId: () => playerId,
  createExplorationId: () => explorationId,
  createClaimNonce: () => "nonce-production-routing",
  createSeed: () => "seed-production-routing",
  createItemInstanceId: () => "unused-item" as ItemInstanceId,
  resolveDurationMs: (_zoneId: ZoneId, durationId: string) =>
    durationId === "short" ? 1_000 : null,
  resolveExploration: () => ({
    result: "success",
    gold: 0,
    exp: 30,
    drops: [],
    summaryMetrics: {}
  }),
  resolveProgressionRule: () => selectedRule,
  progressionRule: fallbackRule,
  recentArchiveRetention: 3
};

function request(path: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("x-wanderloom-player-id", playerId);
  return new Request(`https://example.test${path}`, { ...init, headers });
}

describe("production claim runtime progression routing", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("uses the exploration-specific progression rule when one is selected", async () => {
    const api = createApi(runtime);
    const db = env.DB as unknown as ApiDatabase;

    const bootstrap = await api.fetch(
      new Request("https://example.test/api/guest/bootstrap", { method: "POST" }),
      { DB: db }
    );
    expect(bootstrap.status).toBe(201);

    const start = await api.fetch(
      request("/api/explorations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          zoneId: "m1-smoke-frontier",
          durationId: "short"
        })
      }),
      { DB: db }
    );
    expect(start.status).toBe(201);

    nowValue = "2026-10-03T06:00:02.000Z";
    const claim = await api.fetch(
      request(`/api/explorations/${explorationId}/claim`, { method: "POST" }),
      { DB: db }
    );
    expect(claim.status).toBe(200);

    await expect(claim.json()).resolves.toMatchObject({
      core: {
        progression: {
          level: 2,
          exp: 0
        }
      }
    });
  });
});
