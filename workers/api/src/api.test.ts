import { describe, expect, it } from "vitest";

import type { ExplorationId, ItemInstanceId, PlayerId } from "@wanderloom/game-core";
import { createApi, type ApiDatabase } from "./api";

class FakeStatement {
  bind(..._values: unknown[]): FakeStatement {
    return this;
  }

  async first<T>(): Promise<T | null> {
    return null;
  }

  async run(): Promise<{ meta: { changes: number } }> {
    return { meta: { changes: 1 } };
  }
}

function makeDb(): ApiDatabase {
  return {
    prepare() {
      return new FakeStatement();
    },
    async batch(statements) {
      expect(statements).toHaveLength(3);
      return [{}, {}, {}];
    }
  };
}

describe("CP-10 API wiring", () => {
  it("serves health without player identity", async () => {
    const api = createApi();
    const response = await api.fetch(
      new Request("https://example.test/api/health"),
      { DB: makeDb() }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("bootstraps a guest with deterministic runtime inputs", async () => {
    const api = createApi({
      now: () => "2026-09-21T00:00:00.000Z",
      createPlayerId: () => "player-test" as PlayerId,
      createExplorationId: () => "exploration-test" as ExplorationId,
      createClaimNonce: () => "nonce-test",
      createSeed: () => "seed-test",
      createItemInstanceId: () => "item-test" as ItemInstanceId,
      resolveDurationMs: () => null,
      resolveExploration: () => null,
      recentArchiveRetention: null
    });

    const response = await api.fetch(
      new Request("https://example.test/api/guest/bootstrap", {
        method: "POST"
      }),
      { DB: makeDb() }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      playerId: "player-test",
      core: {
        stateVersion: 0,
        progression: {
          level: 1,
          exp: 0,
          gold: 0
        },
        activeExploration: null
      },
      inventory: {
        stateVersion: 0,
        items: []
      }
    });
  });

  it("requires guest identity on player-scoped routes", async () => {
    const api = createApi();
    const response = await api.fetch(
      new Request("https://example.test/api/state"),
      { DB: makeDb() }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "missing_player_id",
        retryable: false
      }
    });
  });

  it("serves the M2 smoke zone catalog with risk and rarity preview metadata", async () => {
    const api = createApi();
    const response = await api.fetch(
      new Request("https://example.test/api/zones", {
        headers: {
          "x-wanderloom-player-id": "player-test"
        }
      }),
      { DB: makeDb() }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      zones: expect.arrayContaining([
        expect.objectContaining({
          zoneId: "m1-smoke-frontier",
          durations: expect.arrayContaining([
            expect.objectContaining({
              durationId: "short",
              durationMs: 300000,
              risk: {
                failureProbability: 0.25,
                lossPolicy: {
                  retainedGoldRatio: 0.5,
                  retainedExpRatio: 0.5,
                  retainGeneratedDrops: false
                }
              },
              rarities: ["Common", "Rare"]
            })
          ])
        }),
        expect.objectContaining({
          zoneId: "m2-moss-hollow",
          durations: expect.arrayContaining([
            expect.objectContaining({
              durationId: "long",
              durationMs: 600000,
              rarities: ["Uncommon", "Epic"]
            })
          ])
        })
      ])
    });
  });
});
