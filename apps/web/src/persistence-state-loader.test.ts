import { describe, expect, it } from "vitest";

import { ApiError } from "./api-client";
import { loadDrivePersistenceState } from "./persistence-state-loader";
import { initialPersistenceViewState } from "./persistence-state";

describe("CP-37 persistence status loader", () => {
  it("applies connected server state without gameplay coupling", async () => {
    const next = await loadDrivePersistenceState({
      api: {
        async getGoogleDriveConnectionStatus() {
          return {
            state: "connected" as const,
            grantedScope: "openid https://www.googleapis.com/auth/drive.appdata",
            authorizedAt: "2026-09-27T01:01:00.000Z",
            updatedAt: "2026-09-27T01:02:00.000Z"
          };
        }
      },
      current: {
        ...initialPersistenceViewState(),
        googleAccount: "connected"
      }
    });

    expect(next).toMatchObject({
      googleAccount: "connected",
      driveArchive: "connected",
      driveGrantedScope: "openid https://www.googleapis.com/auth/drive.appdata",
      driveMessage: null
    });
  });

  it("keeps the persistence failure local and marks Drive temporarily unavailable", async () => {
    const next = await loadDrivePersistenceState({
      api: {
        async getGoogleDriveConnectionStatus() {
          throw new ApiError(
            503,
            "provider_unavailable",
            true,
            undefined,
            {}
          );
        }
      },
      current: {
        ...initialPersistenceViewState(),
        googleAccount: "connected"
      }
    });

    expect(next).toEqual({
      googleAccount: "connected",
      driveArchive: "temporarily_unavailable",
      driveGrantedScope: null,
      driveAuthorizedAt: null,
      driveUpdatedAt: null,
      driveMessage: "provider_unavailable"
    });
  });
});
