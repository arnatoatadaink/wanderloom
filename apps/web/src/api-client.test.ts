import { describe, expect, it } from "vitest";

import { WanderloomApiClient } from "./api-client";

describe("CP-11 API client", () => {
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
            items: []
          }
        },
        { status: 201 }
      )
    );

    await client.bootstrapGuest();

    expect(client.getPlayerId()).toBe("player-1");
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
