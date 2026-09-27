import { describe, expect, it } from "vitest";

import { WanderloomApiClient } from "./api-client";
import { PersistenceController } from "./persistence-controller";
import { PersistenceCoordinator } from "./persistence-coordinator";

function connectedClient(): WanderloomApiClient {
  return new WanderloomApiClient(async (input) => {
    if (String(input) === "/api/archive/google/status") {
      return Response.json({
        ok: true,
        connection: {
          state: "connected",
          grantedScope: "openid https://www.googleapis.com/auth/drive.appdata",
          authorizedAt: "2026-09-27T01:00:00.000Z",
          updatedAt: "2026-09-27T01:01:00.000Z"
        }
      });
    }

    return new Response(null, { status: 404 });
  }, "player-1");
}

describe("CP-37 persistence coordinator", () => {
  it("marks a restored Google player connected and refreshes Drive state", async () => {
    const coordinator = new PersistenceCoordinator(
      new PersistenceController(connectedClient())
    );

    await expect(coordinator.afterGoogleRestore()).resolves.toMatchObject({
      googleAccount: "connected",
      driveArchive: "connected"
    });
  });

  it("keeps guest account state independent from stored Drive metadata", async () => {
    const coordinator = new PersistenceCoordinator(
      new PersistenceController(connectedClient())
    );

    await expect(coordinator.afterGuestLoad()).resolves.toMatchObject({
      googleAccount: "guest",
      driveArchive: "connected"
    });
  });
});
