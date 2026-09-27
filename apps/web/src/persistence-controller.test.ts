import { describe, expect, it } from "vitest";

import { WanderloomApiClient } from "./api-client";
import { PersistenceController } from "./persistence-controller";

describe("CP-37 persistence controller", () => {
  it("tracks Google connection independently from Drive status", async () => {
    const api = new WanderloomApiClient(async () =>
      Response.json({
        ok: true,
        connection: {
          state: "connected",
          grantedScope: "openid https://www.googleapis.com/auth/drive.appdata",
          authorizedAt: "2026-09-27T02:00:00.000Z",
          updatedAt: "2026-09-27T02:01:00.000Z"
        }
      }), "player-1");
    const controller = new PersistenceController(api);

    controller.markGoogleConnected();
    await controller.refreshDriveStatus();

    expect(controller.getState()).toMatchObject({
      googleAccount: "connected",
      driveArchive: "connected"
    });
  });

  it("keeps Google connection when Drive status lookup is unavailable", async () => {
    const api = new WanderloomApiClient(async () =>
      Response.json(
        {
          ok: false,
          error: {
            code: "provider_unavailable",
            retryable: true
          }
        },
        { status: 503 }
      ),
    "player-1");
    const controller = new PersistenceController(api);

    controller.markGoogleConnected();
    await controller.refreshDriveStatus();

    expect(controller.getState()).toMatchObject({
      googleAccount: "connected",
      driveArchive: "temporarily_unavailable",
      driveMessage: "provider_unavailable"
    });
  });
});
