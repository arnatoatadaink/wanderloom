import { describe, expect, it, vi } from "vitest";

import { ApiError, WanderloomApiClient } from "./api-client";

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
  it("links and restores Google identity through the API client", async () => {
    const observed: string[] = [];
    const client = new WanderloomApiClient(async (input) => {
      const path = String(input);
      observed.push(path);

      if (path === "/api/auth/google/link") {
        return Response.json({
          ok: true,
          accountLink: {
            status: "linked",
            provider: "google",
            subject: "google-sub-1"
          }
        });
      }

      if (path === "/api/auth/google/restore") {
        return Response.json({
          ok: true,
          playerId: "player-restored",
          core: {
            stateVersion: 3,
            progression: { level: 2, exp: 5, gold: 9 },
            activeExploration: null
          },
          inventory: {
            stateVersion: 2,
            equipment: { slots: {} },
            items: []
          }
        });
      }

      return new Response(null, { status: 404 });
    }, "player-guest");

    await expect(
      client.linkGoogleAccount("credential")
    ).resolves.toMatchObject({
      status: "linked",
      provider: "google",
      subject: "google-sub-1"
    });

    await expect(
      client.restoreGoogleAccount("credential")
    ).resolves.toMatchObject({
      playerId: "player-restored"
    });

    expect(client.getPlayerId()).toBe("player-restored");
    expect(observed).toEqual([
      "/api/auth/google/link",
      "/api/auth/google/restore"
    ]);
  });

  it("authorizes Drive and requests archive sync with player identity", async () => {
    const observed: Array<{
      path: string;
      headers: Headers;
      body: unknown;
    }> = [];
    const client = new WanderloomApiClient(async (input, init) => {
      const headers = new Headers(init?.headers);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      observed.push({ path: String(input), headers, body });

      if (String(input) === "/api/archive/google/authorize") {
        return Response.json({
          ok: true,
          authorized: true,
          scope: "openid https://www.googleapis.com/auth/drive.appdata"
        });
      }

      return Response.json({
        ok: true,
        sync: {
          attempted: 1,
          synced: 1,
          failed: 0,
          skippedNonRetryable: 0
        }
      });
    }, "player-1");

    await expect(
      client.authorizeGoogleDrive("code-1", "http://localhost:5173")
    ).resolves.toMatchObject({
      authorized: true
    });
    await expect(client.syncArchive()).resolves.toEqual({
      attempted: 1,
      synced: 1,
      failed: 0,
      skippedNonRetryable: 0
    });

    expect(observed[0]?.headers.get("x-requested-with")).toBe(
      "XmlHttpRequest"
    );
    expect(observed[0]?.headers.get("x-wanderloom-player-id")).toBe(
      "player-1"
    );
    expect(observed[0]?.body).toEqual({
      code: "code-1",
      redirectUri: "http://localhost:5173"
    });
    expect(observed[1]?.headers.get("x-wanderloom-player-id")).toBe(
      "player-1"
    );
  });

  it("preserves API retryability and details on errors", async () => {
    const client = new WanderloomApiClient(async () =>
      Response.json(
        {
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
        },
        { status: 409 }
      )
    , "player-1");

    await expect(client.getInventory()).rejects.toMatchObject({
      status: 409,
      code: "version_conflict",
      retryable: true,
      details: {
        snapshot: "inventory",
        expectedVersion: 1,
        actualVersion: 2
      }
    } satisfies Partial<ApiError>);
  });
});
