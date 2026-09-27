import { describe, expect, it, vi } from "vitest";

import { runArchiveSyncFlow } from "./archive-sync-flow";
import { initialPersistenceViewState } from "./persistence-state";

describe("CP-38 archive sync flow", () => {
  it("skips the OAuth popup when Drive authorization is already connected", async () => {
    const requestDriveAuthorization = vi.fn(async () => "code-1");
    const authorizeGoogleDrive = vi.fn(async () => ({ authorized: true }));
    const afterDriveAuthorization = vi.fn(async () => undefined);
    const syncArchive = vi.fn(async () => ({
      attempted: 1,
      synced: 1,
      failed: 0,
      skippedNonRetryable: 0
    }));

    const result = await runArchiveSyncFlow({
      persistence: {
        ...initialPersistenceViewState(),
        driveArchive: "connected"
      },
      origin: "https://wanderloom.test",
      dependencies: {
        requestDriveAuthorization,
        authorizeGoogleDrive,
        afterDriveAuthorization,
        syncArchive
      }
    });

    expect(requestDriveAuthorization).not.toHaveBeenCalled();
    expect(authorizeGoogleDrive).not.toHaveBeenCalled();
    expect(afterDriveAuthorization).not.toHaveBeenCalled();
    expect(syncArchive).toHaveBeenCalledOnce();
    expect(result.synced).toBe(1);
  });

  it("requests authorization before sync when Drive is not connected", async () => {
    const calls: string[] = [];

    await runArchiveSyncFlow({
      persistence: {
        ...initialPersistenceViewState(),
        driveArchive: "not_connected"
      },
      origin: "https://wanderloom.test",
      dependencies: {
        async requestDriveAuthorization() {
          calls.push("popup");
          return "code-2";
        },
        async authorizeGoogleDrive(code, origin) {
          calls.push(`authorize:${code}:${origin}`);
        },
        async afterDriveAuthorization() {
          calls.push("refresh");
        },
        async syncArchive() {
          calls.push("sync");
          return {
            attempted: 1,
            synced: 1,
            failed: 0,
            skippedNonRetryable: 0
          };
        }
      }
    });

    expect(calls).toEqual([
      "popup",
      "authorize:code-2:https://wanderloom.test",
      "refresh",
      "sync"
    ]);
  });
});
