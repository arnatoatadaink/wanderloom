import { describe, expect, it } from "vitest";

import type { PlayerId } from "@wanderloom/game-core";
import {
  getGoogleDriveConnectionStatus,
  type GoogleDriveAuthorizationReader
} from "./get-google-drive-connection-status";

const playerId = "player-cp36" as PlayerId;

describe("getGoogleDriveConnectionStatus", () => {
  it("returns not_connected without exposing credentials when no authorization exists", async () => {
    const repository: GoogleDriveAuthorizationReader = {
      async findByPlayerId() {
        return null;
      }
    };

    await expect(
      getGoogleDriveConnectionStatus({ playerId, repository })
    ).resolves.toEqual({
      state: "not_connected",
      grantedScope: null,
      authorizedAt: null,
      updatedAt: null
    });
  });

  it("returns safe connected metadata without refresh-token material", async () => {
    const repository: GoogleDriveAuthorizationReader = {
      async findByPlayerId() {
        return {
          refreshTokenCiphertext: "ciphertext-must-not-escape",
          refreshTokenIv: "iv-must-not-escape",
          grantedScope: "openid https://www.googleapis.com/auth/drive.appdata",
          authorizedAt: "2026-09-25T08:00:00.000Z",
          updatedAt: "2026-09-26T08:00:00.000Z"
        };
      }
    };

    const status = await getGoogleDriveConnectionStatus({
      playerId,
      repository
    });

    expect(status).toEqual({
      state: "connected",
      grantedScope: "openid https://www.googleapis.com/auth/drive.appdata",
      authorizedAt: "2026-09-25T08:00:00.000Z",
      updatedAt: "2026-09-26T08:00:00.000Z"
    });
    expect(status).not.toHaveProperty("refreshTokenCiphertext");
    expect(status).not.toHaveProperty("refreshTokenIv");
    expect(status).not.toHaveProperty("accessToken");
  });
});
