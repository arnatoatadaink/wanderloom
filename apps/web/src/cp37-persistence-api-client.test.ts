import { describe, expect, it } from "vitest";

import { WanderloomApiClient } from "./api-client";

describe("CP-37 persistence API client", () => {
  it("reads Drive connection status with the current player identity", async () => {
    let observedPlayerId: string | null = null;

    const client = new WanderloomApiClient(async (input, init) => {
      expect(String(input)).toBe("/api/archive/google/status");
      observedPlayerId = new Headers(init?.headers).get(
        "x-wanderloom-player-id"
      );

      return Response.json({
        ok: true,
        connection: {
          state: "connected",
          grantedScope:
            "openid https://www.googleapis.com/auth/drive.appdata",
          authorizedAt: "2026-09-27T01:01:00.000Z",
          updatedAt: "2026-09-27T01:02:00.000Z"
        }
      });
    }, "player-cp37");

    await expect(client.getGoogleDriveConnectionStatus()).resolves.toEqual({
      state: "connected",
      grantedScope:
        "openid https://www.googleapis.com/auth/drive.appdata",
      authorizedAt: "2026-09-27T01:01:00.000Z",
      updatedAt: "2026-09-27T01:02:00.000Z"
    });
    expect(observedPlayerId).toBe("player-cp37");
  });
});
