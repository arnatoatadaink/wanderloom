import { describe, expect, it, vi } from "vitest";

import { WanderloomApiClient } from "./api-client";

describe("CP-11/17 API client", () => {
  it("invokes the default browser fetch with its global receiver", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json({ ok: true, zones: [] }));

    try {
      const client = new WanderloomApiClient(undefined, "player-1");

      await client.getZones();

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/zones",
        expect.objectContaining({
          headers: expect.any(Headers)
        })
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("persists the bootstrapped player identity in the client", async () => {
    const client = new WanderloomApiClient(async () =>
      Response.json(
        {
          ok: true,
          playerId: "player-1",
          core: {
            stateVersion: 0,
            progression: { level: 1, exp: 0, gold: 0 },
            activeExploration: null
          },
          inventory: {
            stateVersion: 0,
            equipment: { slots: {} },
            items: []
          }
        },
        { status: 201 }
      )
    );

    await client.bootstrapGuest();

    expect(client.getPlayerId()).toBe("player-1");
  });

  it("reads inventory and sends equipment actions with the expected version", async () => {
    const observed: Array<{ path: string; body: unknown }> = [];
    const client = new WanderloomApiClient(async (input, init) => {
      const path = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      observed.push({ path, body });

      if (path === "/api/inventory") {
        return Response.json({
          ok: true,
          inventory: {
            stateVersion: 1,
            equipment: { slots: { charm: null } },
            items: [{
              itemInstanceId: "item-1",
              itemDefinitionId: "m1-wayfarer-charm",
              createdAt: "2026-09-22T00:00:00.000Z"
            }]
          }
        });
      }

      return Response.json({
        ok: true,
        idempotent: false,
        inventory: {
          stateVersion: 2,
          equipment: { slots: { charm: "item-1" } },
          items: [{
            itemInstanceId: "item-1",
            itemDefinitionId: "m1-wayfarer-charm",
            createdAt: "2026-09-22T00:00:00.000Z"
          }]
        }
      });
    }, "player-1");

    const inventory = await client.getInventory();
    expect(inventory.stateVersion).toBe(1);

    const equipped = await client.equipItem("charm", "item-1", inventory.stateVersion);
    expect(equipped.equipment.slots.charm).toBe("item-1");
    expect(observed[1]).toEqual({
      path: "/api/equipment",
      body: {
        slot: "charm",
        itemInstanceId: "item-1",
        expectedInventoryStateVersion: 1
      }
    });
  });

  it("preserves CP-25 risk and rarity metadata from the zones response", async () => {
    const client = new WanderloomApiClient(async () =>
      Response.json({
        ok: true,
        zones: [
          {
            zoneId: "m1-smoke-frontier",
            name: "M1 Smoke Frontier",
            durations: [
              {
                durationId: "short",
                durationMs: 300000,
                preview: {
                  gold: { min: 5, max: 6 },
                  exp: { min: 10, max: 10 },
                  drops: { minItems: 1, maxItems: 1 }
                },
                risk: {
                  failureProbability: 0.25,
                  lossPolicy: {
                    retainedGoldRatio: 0.5,
                    retainedExpRatio: 0.5,
                    retainGeneratedDrops: false
                  }
                },
                rarities: ["Common", "Rare"]
              }
            ]
          }
        ]
      })
    , "player-1");

    const zones = await client.getZones();

    expect(zones[0]?.durations[0]).toMatchObject({
      risk: {
        failureProbability: 0.25,
        lossPolicy: {
          retainedGoldRatio: 0.5,
          retainedExpRatio: 0.5,
          retainGeneratedDrops: false
        }
      },
      rarities: ["Common", "Rare"]
    });
  });

  it("sends the guest identity on player-scoped requests", async () => {
    let observedHeader: string | null = null;

    const client = new WanderloomApiClient(async (_input, init) => {
      observedHeader = new Headers(init?.headers).get(
        "x-wanderloom-player-id"
      );
      return Response.json({
        ok: true,
        zones: []
      });
    }, "player-1");

    await client.getZones();

    expect(observedHeader).toBe("player-1");
  });
});
