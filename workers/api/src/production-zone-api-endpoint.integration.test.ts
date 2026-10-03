import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import type { ApiDatabase } from "./api";
import worker from "./index";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

const playerId = "player-production-zone-endpoint";

function playerRequest(path: string): Request {
  return new Request(`https://example.test${path}`, {
    headers: {
      "x-wanderloom-player-id": playerId
    }
  });
}

describe("production zone API endpoint", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("returns the Rank 0 production catalog for a bootstrapped player", async () => {
    const db = env.DB as unknown as ApiDatabase;

    const bootstrap = await worker.fetch(
      new Request("https://example.test/api/guest/bootstrap", {
        method: "POST"
      }),
      { DB: db }
    );
    expect(bootstrap.status).toBe(201);

    const bootstrapBody = (await bootstrap.json()) as {
      readonly playerId: string;
    };
    const zones = await worker.fetch(
      new Request("https://example.test/api/zones", {
        headers: {
          "x-wanderloom-player-id": bootstrapBody.playerId
        }
      }),
      { DB: db }
    );

    expect(zones.status).toBe(200);
    const zonesBody = (await zones.json()) as {
      readonly ok: true;
      readonly zones: readonly {
        readonly zoneId: string;
        readonly minimumZoneRank: number;
        readonly unlocked: boolean;
        readonly durations: readonly unknown[];
      }[];
    };

    expect(zonesBody.ok).toBe(true);
    expect(zonesBody.zones).toHaveLength(5);
    expect(zonesBody.zones.map(({ zoneId, minimumZoneRank, unlocked }) => ({
      zoneId,
      minimumZoneRank,
      unlocked
    }))).toEqual([
      {
        zoneId: "wayfarer-meadow",
        minimumZoneRank: 0,
        unlocked: true
      },
      {
        zoneId: "mossglass-grove",
        minimumZoneRank: 1,
        unlocked: false
      },
      {
        zoneId: "shattered-causeway",
        minimumZoneRank: 2,
        unlocked: false
      },
      {
        zoneId: "ashwind-highlands",
        minimumZoneRank: 3,
        unlocked: false
      },
      {
        zoneId: "starfall-frontier",
        minimumZoneRank: 4,
        unlocked: false
      }
    ]);
    expect(zonesBody.zones[0]?.durations).toHaveLength(3);
  });

  it("preserves missing-player and unknown-player errors", async () => {
    const db = env.DB as unknown as ApiDatabase;

    const missing = await worker.fetch(
      new Request("https://example.test/api/zones"),
      { DB: db }
    );
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toMatchObject({
      error: { code: "missing_player_id" }
    });

    const unknown = await worker.fetch(playerRequest("/api/zones"), {
      DB: db
    });
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toMatchObject({
      error: { code: "player_not_found" }
    });
  });
});
