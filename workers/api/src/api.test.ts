import { describe, expect, it } from "vitest";

import type { PlayerId } from "@wanderloom/game-core";
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
      createPlayerId: () => "player-test" as PlayerId
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
        code: "missing_player_id"
      }
    });
  });

  it("keeps unresolved game-data routes explicit", async () => {
    const api = createApi();
    const response = await api.fetch(
      new Request("https://example.test/api/zones", {
        headers: {
          "x-wanderloom-player-id": "player-test"
        }
      }),
      { DB: makeDb() }
    );

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "not_ready",
        feature: "zone_catalog"
      }
    });
  });
});
