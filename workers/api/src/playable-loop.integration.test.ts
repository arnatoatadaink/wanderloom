import {
  applyD1Migrations,
  env
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import {
  instantiateDrop,
  measureJsonUtf8,
  resolveSeededM1Exploration,
  type ExplorationId,
  type ItemInstanceId,
  type PlayerId
} from "@wanderloom/game-core";
import {
  createApi,
  type ApiDatabase,
  type ApiRuntime
} from "./api";
import {
  CP13_PAYLOAD_BUDGET_BYTES,
  CP13_SNAPSHOT_BUDGET_BYTES
} from "./cp13-budgets";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

const playerId = "player-cp12" as PlayerId;
const firstExplorationId = "exploration-cp12-1" as ExplorationId;
const secondExplorationId = "exploration-cp12-2" as ExplorationId;

let nowValue = "2026-09-21T00:00:00.000Z";
let explorationSequence = 0;

const runtime: ApiRuntime = {
  now: () => nowValue,
  createPlayerId: () => playerId,
  createExplorationId: () => {
    explorationSequence += 1;
    return explorationSequence === 1
      ? firstExplorationId
      : secondExplorationId;
  },
  createClaimNonce: () => `nonce-${explorationSequence + 1}`,
  createSeed: () => `seed-${explorationSequence + 1}`,
  createItemInstanceId: () => "item-instance-cp15" as ItemInstanceId,
  resolveDurationMs: (_zoneId, durationId) =>
    durationId === "short" ? 300_000 : null,
  resolveExploration: (exploration, claimedAt, createItemInstanceId) => {
    const resolved = resolveSeededM1Exploration({
      seed: exploration.seed,
      explorationId: exploration.explorationId,
      zoneId: exploration.zoneId,
      durationId: exploration.durationId
    });

    return {
      result: resolved.result,
      gold: resolved.gold,
      exp: resolved.exp,
      drops: resolved.generatedDrops.map((generatedDrop) =>
        instantiateDrop({
          generatedDrop,
          itemInstanceId: createItemInstanceId(),
          createdAt: claimedAt
        })
      ),
      summaryMetrics: resolved.summaryMetrics
    };
  },
  recentArchiveRetention: 3
};

function request(
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

describe("CP-19 full M1 acceptance loop with real D1", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("bootstraps, starts, claims, applies rewards, and can start again", async () => {
    const api = createApi(runtime);
    const db = env.DB as unknown as ApiDatabase;

    const bootstrapResponse = await api.fetch(
      new Request("https://example.test/api/guest/bootstrap", {
        method: "POST"
      }),
      { DB: db }
    );
    expect(bootstrapResponse.status).toBe(201);
    const bootstrapBody = (await bootstrapResponse.clone().json()) as {
      readonly core: unknown;
      readonly inventory: unknown;
    };
    expect(measureJsonUtf8(bootstrapBody.core).bytes).toBeLessThanOrEqual(
      CP13_SNAPSHOT_BUDGET_BYTES.core
    );
    expect(measureJsonUtf8(bootstrapBody.inventory).bytes).toBeLessThanOrEqual(
      CP13_SNAPSHOT_BUDGET_BYTES.inventory
    );

    const inventoryResponse = await api.fetch(
      request("/api/inventory"),
      { DB: db }
    );
    expect(inventoryResponse.status).toBe(200);
    expect(
      new TextEncoder().encode(await inventoryResponse.clone().text()).byteLength
    ).toBeLessThanOrEqual(CP13_PAYLOAD_BUDGET_BYTES.inventory);

    const zonesResponse = await api.fetch(
      request("/api/zones"),
      { DB: db }
    );
    expect(zonesResponse.status).toBe(200);
    expect(
      new TextEncoder().encode(await zonesResponse.clone().text()).byteLength
    ).toBeLessThanOrEqual(CP13_PAYLOAD_BUDGET_BYTES.zoneCatalog);
    await expect(zonesResponse.clone().json()).resolves.toMatchObject({
      ok: true,
      zones: expect.arrayContaining([
        expect.objectContaining({
          zoneId: "m1-smoke-frontier",
          durations: expect.arrayContaining([
            expect.objectContaining({
              durationId: "short",
              preview: {
                gold: { min: 5, max: 6 },
                exp: { min: 10, max: 10 },
                drops: { minItems: 1, maxItems: 1 }
              }
            })
          ])
        })
      ])
    });

    const startResponse = await api.fetch(
      request("/api/explorations", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          zoneId: "m1-smoke-frontier",
          durationId: "short"
        })
      }),
      { DB: db }
    );
    expect(startResponse.status).toBe(201);

    const started = (await startResponse.json()) as {
      readonly core: {
        readonly stateVersion: number;
        readonly activeExploration: {
          readonly explorationId: string;
          readonly endsAt: string;
        } | null;
      };
    };

    expect(started.core.stateVersion).toBe(1);
    expect(started.core.activeExploration?.explorationId).toBe(
      firstExplorationId
    );
    expect(started.core.activeExploration?.endsAt).toBe(
      "2026-09-21T00:05:00.000Z"
    );

    const currentResponse = await api.fetch(
      request("/api/explorations/current"),
      { DB: db }
    );
    expect(currentResponse.status).toBe(200);
    await expect(currentResponse.json()).resolves.toMatchObject({
      ok: true,
      exploration: {
        explorationId: firstExplorationId,
        zoneId: "m1-smoke-frontier",
        durationId: "short"
      }
    });

    nowValue = "2026-09-21T00:05:01.000Z";

    const claimResponse = await api.fetch(
      request(
        `/api/explorations/${firstExplorationId}/claim`,
        { method: "POST" }
      ),
      { DB: db }
    );
    expect(claimResponse.status).toBe(200);
    expect(
      new TextEncoder().encode(await claimResponse.clone().text()).byteLength
    ).toBeLessThanOrEqual(CP13_PAYLOAD_BUDGET_BYTES.claim);

    const claimed = (await claimResponse.json()) as {
      readonly core: {
        readonly stateVersion: number;
        readonly progression: {
          readonly gold: number;
          readonly exp: number;
        };
        readonly activeExploration: null;
      };
      readonly inventory: {
        readonly stateVersion: number;
        readonly items: readonly {
          readonly itemInstanceId: string;
          readonly itemDefinitionId: string;
          readonly createdAt: string;
        }[];
      };
      readonly archiveEntry: {
        readonly rewards: {
          readonly gold: number;
          readonly exp: number;
          readonly drops: readonly {
            readonly itemInstanceId: string;
            readonly itemDefinitionId: string;
            readonly createdAt: string;
          }[];
        };
      };
    };

    expect(claimed.core.stateVersion).toBe(2);
    expect(claimed.inventory.stateVersion).toBe(1);
    expect(claimed.core.progression).toMatchObject({
      gold: 6,
      exp: 10
    });
    expect(claimed.core.activeExploration).toBeNull();
    expect(claimed.inventory.items).toEqual([
      {
        itemInstanceId: "item-instance-cp15",
        itemDefinitionId: "m1-wayfarer-charm",
        createdAt: "2026-09-21T00:05:01.000Z"
      }
    ]);
    expect(claimed.archiveEntry.rewards).toMatchObject({
      gold: 6,
      exp: 10,
      drops: claimed.inventory.items
    });
    expect(measureJsonUtf8(claimed.core).bytes).toBeLessThanOrEqual(
      CP13_SNAPSHOT_BUDGET_BYTES.core
    );
    expect(measureJsonUtf8(claimed.inventory).bytes).toBeLessThanOrEqual(
      CP13_SNAPSHOT_BUDGET_BYTES.inventory
    );
    expect(measureJsonUtf8(claimed.archiveEntry).bytes).toBeLessThanOrEqual(
      CP13_SNAPSHOT_BUDGET_BYTES.archiveEntry
    );

    const persistedStateResponse = await api.fetch(
      request("/api/state"),
      { DB: db }
    );
    expect(
      new TextEncoder().encode(await persistedStateResponse.clone().text()).byteLength
    ).toBeLessThanOrEqual(CP13_PAYLOAD_BUDGET_BYTES.state);
    await expect(persistedStateResponse.json()).resolves.toMatchObject({
      ok: true,
      core: {
        stateVersion: 2,
        progression: {
          gold: 6,
          exp: 10
        },
        activeExploration: null
      }
    });

    const archive = await env.DB
      .prepare(
        `SELECT COUNT(*) AS count
         FROM recent_archive
         WHERE player_id = ?1
           AND exploration_id = ?2`
      )
      .bind(playerId, firstExplorationId)
      .first<{ count: number }>();

    expect(archive?.count).toBe(1);

    const duplicateClaimResponse = await api.fetch(
      request(
        `/api/explorations/${firstExplorationId}/claim`,
        { method: "POST" }
      ),
      { DB: db }
    );

    expect(duplicateClaimResponse.status).toBe(409);
    await expect(duplicateClaimResponse.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "already_claimed",
        retryable: true,
        details: {
          explorationId: firstExplorationId
        }
      }
    });

    const stateAfterDuplicateResponse = await api.fetch(
      request("/api/state"),
      { DB: db }
    );
    await expect(stateAfterDuplicateResponse.json()).resolves.toMatchObject({
      ok: true,
      core: {
        stateVersion: 2,
        progression: {
          gold: 6,
          exp: 10
        },
        activeExploration: null
      }
    });

    const inventoryAfterDuplicateResponse = await api.fetch(
      request("/api/inventory"),
      { DB: db }
    );
    await expect(inventoryAfterDuplicateResponse.json()).resolves.toMatchObject({
      ok: true,
      inventory: {
        stateVersion: 1,
        items: [
          {
            itemInstanceId: "item-instance-cp15",
            itemDefinitionId: "m1-wayfarer-charm"
          }
        ]
      }
    });

    nowValue = "2026-09-21T00:05:30.000Z";

    const equipResponse = await api.fetch(
      request("/api/equipment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot: "charm",
          itemInstanceId: "item-instance-cp15",
          expectedInventoryStateVersion: 1
        })
      }),
      { DB: db }
    );
    expect(equipResponse.status).toBe(200);
    await expect(equipResponse.json()).resolves.toMatchObject({
      ok: true,
      idempotent: false,
      inventory: {
        stateVersion: 2,
        equipment: {
          slots: {
            charm: "item-instance-cp15"
          }
        }
      }
    });

    const equipRetryResponse = await api.fetch(
      request("/api/equipment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot: "charm",
          itemInstanceId: "item-instance-cp15",
          expectedInventoryStateVersion: 1
        })
      }),
      { DB: db }
    );
    expect(equipRetryResponse.status).toBe(200);
    await expect(equipRetryResponse.json()).resolves.toMatchObject({
      ok: true,
      idempotent: true,
      inventory: {
        stateVersion: 2
      }
    });

    const staleEquipResponse = await api.fetch(
      request("/api/equipment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot: "charm",
          itemInstanceId: "missing-item",
          expectedInventoryStateVersion: 1
        })
      }),
      { DB: db }
    );
    expect(staleEquipResponse.status).toBe(409);
    await expect(staleEquipResponse.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "version_conflict",
        retryable: true,
        details: {
          snapshot: "inventory",
          expectedVersion: 1,
          actualVersion: 2
        }
      }
    });

    const invalidSlotResponse = await api.fetch(
      request("/api/equipment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot: "weapon",
          itemInstanceId: "item-instance-cp15",
          expectedInventoryStateVersion: 2
        })
      }),
      { DB: db }
    );
    expect(invalidSlotResponse.status).toBe(400);
    await expect(invalidSlotResponse.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "invalid_equipment_slot",
        retryable: false,
        details: {
          slot: "weapon"
        }
      }
    });

    const unownedEquipResponse = await api.fetch(
      request("/api/equipment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slot: "charm",
          itemInstanceId: "missing-item",
          expectedInventoryStateVersion: 2
        })
      }),
      { DB: db }
    );
    expect(unownedEquipResponse.status).toBe(400);
    await expect(unownedEquipResponse.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "item_not_owned",
        retryable: false,
        details: {
          itemInstanceId: "missing-item"
        }
      }
    });

    const equippedInventoryResponse = await api.fetch(
      request("/api/inventory"),
      { DB: db }
    );
    await expect(equippedInventoryResponse.json()).resolves.toMatchObject({
      ok: true,
      inventory: {
        stateVersion: 2,
        equipment: {
          slots: {
            charm: "item-instance-cp15"
          }
        }
      }
    });

    nowValue = "2026-09-21T00:06:00.000Z";

    const restartResponse = await api.fetch(
      request("/api/explorations", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          zoneId: "m1-smoke-frontier",
          durationId: "short"
        })
      }),
      { DB: db }
    );

    expect(restartResponse.status).toBe(201);
    const restarted = (await restartResponse.json()) as {
      readonly core: {
        readonly stateVersion: number;
        readonly activeExploration: {
          readonly explorationId: string;
        } | null;
      };
    };
    expect(restarted).toMatchObject({
      ok: true,
      core: {
        stateVersion: 3,
        activeExploration: {
          explorationId: secondExplorationId
        }
      }
    });

    const finalInventoryResponse = await api.fetch(
      request("/api/inventory"),
      { DB: db }
    );
    await expect(finalInventoryResponse.json()).resolves.toMatchObject({
      ok: true,
      inventory: {
        stateVersion: 2,
        equipment: {
          slots: {
            charm: "item-instance-cp15"
          }
        },
        items: [
          {
            itemInstanceId: "item-instance-cp15",
            itemDefinitionId: "m1-wayfarer-charm"
          }
        ]
      }
    });
  });
});
