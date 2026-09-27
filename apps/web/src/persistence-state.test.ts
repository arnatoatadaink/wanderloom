import { describe, expect, it } from "vitest";

import {
  applyDriveConnectionStatus,
  initialPersistenceViewState,
  markDriveTemporarilyUnavailable
} from "./persistence-state";

describe("CP-37 persistence view state", () => {
  it("starts independently from gameplay state", () => {
    expect(initialPersistenceViewState()).toEqual({
      googleAccount: "unknown",
      driveArchive: "unknown",
      driveGrantedScope: null,
      driveAuthorizedAt: null,
      driveUpdatedAt: null,
      driveMessage: null
    });
  });

  it("applies connected Drive metadata without gameplay fields", () => {
    const next = applyDriveConnectionStatus(initialPersistenceViewState(), {
      state: "connected",
      grantedScope: "openid https://www.googleapis.com/auth/drive.appdata",
      authorizedAt: "2026-09-27T01:00:00.000Z",
      updatedAt: "2026-09-27T01:01:00.000Z"
    });

    expect(next.driveArchive).toBe("connected");
    expect(next.driveGrantedScope).toContain("drive.appdata");
    expect(next.driveMessage).toBeNull();
    expect(next).not.toHaveProperty("busy");
    expect(next).not.toHaveProperty("errorMessage");
  });

  it("keeps transient Drive failure local to persistence state", () => {
    const next = markDriveTemporarilyUnavailable(
      {
        ...initialPersistenceViewState(),
        driveArchive: "connected"
      },
      "drive_create_http_503"
    );

    expect(next.driveArchive).toBe("temporarily_unavailable");
    expect(next.driveMessage).toBe("drive_create_http_503");
    expect(next).not.toHaveProperty("phase");
  });
});
