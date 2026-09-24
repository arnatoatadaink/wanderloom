import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import {
  type ExplorationId,
  type ItemDefinitionId,
  type ItemInstanceId,
  type PlayerId,
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

const playerId = "player-cp27" as PlayerId;
const zoneId = "m1-smoke-frontier" as ZoneId;
let now = "2026-09-24T00:00:00.000Z";
let explorationSequence = 0;

function request(path: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("x-wanderloom-player-id", playerId);
  return new Request(`https://example.test${path}`, {
    ...init,
    headers
  });
}

const runtime: ApiRuntime = {
  now: () => now,
  createPlayerId: () => playerId,
  createExplorationId: () => {
    explorationSequence += 1;
    return `exploration-cp27-${explorationSequence}` as ExplorationId;
  },
  createClaimNonce: () => `nonce-cp27-${explorationSequence}`,
  createSeed: () => `seed-cp27-${explorationSequence}`,
  createItemInstanceId: () => "item-cp27-rare" as ItemInstanceId,
  resolveDurationMs: (_zoneId, durationId) =>
    durationId === "short" ? 300_000 : durationId === "long" ? 600_000 : null,
  resolveExploration: (_exploration, claimedAt) => ({
    result: "success",
    gold: 6,
    exp: 10,
    drops: [{
      itemInstanceId: "item-cp27-rare" as ItemInstanceId,
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
  }]
};

describe("CP-27 full M2 acceptance with real D1", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("compares choices, claims a rarity item, equips it, and starts again with changed effective stats", async () => {
    const api = createApi(runtime);
    const db = env.DB as unknown as ApiDatabase;

    const bootstrap = await api.fetch(
      new Request("https://example.test/api/guest/bootstrap", { method: "POST" }),
      { DB: db }
    );
    expect(bootstrap.status).toBe(201);

    const zones = await api.fetch(request("/api/zones"), { DB: db });
    expect(zones.status).toBe(200);
    const zoneBody = (await zones.json()) as {
      readonly zones: readonly {
        readonly zoneId: string;
        readonly durations: readonly {
          readonly durationId: string;
          readonly risk?: unknown;
          readonly rarities?: readonly string[];
        }[];
      }[];
    };
    expect(zoneBody.zones.length).toBeGreaterThanOrEqual(2);
    expect(zoneBody.zones[0]?.durations.length).toBeGreaterThanOrEqual(2);
    expect(zoneBody.zones[0]?.durations[0]).toMatchObject({
      durationId: "short",
      risk: expect.any(Object),
      rarities: expect.arrayContaining(["Common", "Rare"])
    });

    const start = await api.fetch(
      request("/api/explorations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zoneId, durationId: "short" })
      }),
      { DB: db }
    );
    expect(start.status).toBe(201);
    await expect(start.clone().json()).resolves.toMatchObject({
      core: {
        activeExploration: {
          characterSnapshot: {
            stats: {},
            baseStats: {},
            equipmentEffects: []
          }
        }
      }
    });

    now = "2026-09-24T00:05:01.000Z";
    const claim = await api.fetch(
      request("/api/explorations/exploration-cp27-1/claim", { method: "POST" }),
      { DB: db }
    );
    expect(claim.status).toBe(200);
    const claimBody = (await claim.json()) as {
      readonly inventory: {
        readonly stateVersion: number;
        readonly items: readonly {
          readonly itemInstanceId: string;
          readonly rarity?: string;
        }[];
      };
      readonly archiveEntry: {
        readonly result: string;
        readonly rewards: {
          readonly drops: readonly {
            readonly itemInstanceId: string;
            readonly rarity?: string;
          }[];
        };
      };
    };
    expect(claimBody.archiveEntry).toMatchObject({
      result: "success",
      rewards: {
        drops: [{
          itemInstanceId: "item-cp27-rare",
          rarity: "Rare"
        }]
      }
    });
    expect(claimBody.inventory.items[0]?.rarity).toBe("Rare");

    now = "2026-09-24T00:05:02.000Z";
    const equip = await api.fetch(
      request("/api/equipment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot: "charm",
          itemInstanceId: "item-cp27-rare",
          expectedInventoryStateVersion: claimBody.inventory.stateVersion
        })
      }),
      { DB: db }
    );
    expect(equip.status).toBe(200);
    await expect(equip.clone().json()).resolves.toMatchObject({
      inventory: {
        equipment: {
          slots: {
            charm: "item-cp27-rare"
          }
        }
      }
    });

    now = "2026-09-24T00:05:03.000Z";
    const restart = await api.fetch(
      request("/api/explorations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zoneId, durationId: "short" })
      }),
      { DB: db }
    );
    expect(restart.status).toBe(201);
    await expect(restart.clone().json()).resolves.toMatchObject({
      core: {
        activeExploration: {
          explorationId: "exploration-cp27-2",
          characterSnapshot: {
            baseStats: {},
            stats: {
              power: 2,
              luck: 1
            },
            equipmentEffects: [{
              slot: "charm",
              itemInstanceId: "item-cp27-rare",
              itemDefinitionId: "m2-wayfarer-charm-rare",
              statModifiers: {
                power: 2,
                luck: 1
              }
            }]
          }
        }
      }
    });

    const current = await api.fetch(
      request("/api/explorations/current"),
      { DB: db }
    );
    await expect(current.json()).resolves.toMatchObject({
      exploration: {
        explorationId: "exploration-cp27-2",
        characterSnapshot: {
          stats: {
            power: 2,
            luck: 1
          }
        }
      }
    });
  });
});
