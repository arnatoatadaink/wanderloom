import { describe, expect, it, vi } from "vitest";

import {
  runBestEffortArchiveSync,
  shouldTriggerBestEffortArchiveSync
} from "./best-effort-archive-sync";
import { initialPersistenceViewState } from "./persistence-state";

describe("CP-41 best-effort archive sync trigger", () => {
  it.each(["connected", "temporarily_unavailable"] as const)(
    "triggers background sync when Drive state is %s",
    (driveArchive) => {
      expect(
        shouldTriggerBestEffortArchiveSync({
          ...initialPersistenceViewState(),
          driveArchive
        })
      ).toBe(true);
    }
  );

  it.each([
    "unknown",
    "not_connected",
    "reauthorization_required"
  ] as const)("does not trigger OAuth or sync when Drive state is %s", (driveArchive) => {
    expect(
      shouldTriggerBestEffortArchiveSync({
        ...initialPersistenceViewState(),
        driveArchive
      })
    ).toBe(false);
  });

  it("swallows sync failure and refreshes status without rejecting claim flow", async () => {
    const refreshDriveStatus = vi.fn(async () => undefined);
    const error = new Error("provider unavailable");

    const outcome = await runBestEffortArchiveSync({
      persistence: {
        ...initialPersistenceViewState(),
        driveArchive: "connected"
      },
      dependencies: {
        async syncArchive() {
          throw error;
        },
        refreshDriveStatus
      }
    });

    expect(outcome).toEqual({
      attempted: true,
      ok: false,
      error
    });
    expect(refreshDriveStatus).toHaveBeenCalledOnce();
  });

  it("does not call sync when authorization is unavailable", async () => {
    const syncArchive = vi.fn(async () => ({
      attempted: 1,
      synced: 1,
      failed: 0,
      skippedNonRetryable: 0
    }));

    const outcome = await runBestEffortArchiveSync({
      persistence: {
        ...initialPersistenceViewState(),
        driveArchive: "reauthorization_required"
      },
      dependencies: {
        syncArchive,
        async refreshDriveStatus() {}
      }
    });

    expect(outcome).toEqual({
      attempted: false,
      reason: "authorization_unavailable"
    });
    expect(syncArchive).not.toHaveBeenCalled();
  });
});
