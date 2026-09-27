import { describe, expect, it, vi } from "vitest";

import { runArchiveSyncFlow } from "./archive-sync-flow";
import { initialPersistenceViewState } from "./persistence-state";

describe("CP-38/CP-40 archive sync flow", () => {
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

  it("retries a temporary Drive outage without opening a consent popup", async () => {
    const requestDriveAuthorization = vi.fn(async () => "unexpected-code");
    const authorizeGoogleDrive = vi.fn(async () => ({ authorized: true }));
    const afterDriveAuthorization = vi.fn(async () => undefined);
    const syncArchive = vi.fn(async () => ({
      attempted: 1,
      synced: 1,
      failed: 0,
      skippedNonRetryable: 0
    }));

    await runArchiveSyncFlow({
      persistence: {
        ...initialPersistenceViewState(),
        googleAccount: "connected",
        driveArchive: "temporarily_unavailable",
        driveMessage: "google_drive_provider_unavailable"
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
  });

  it("stops locally when reconnect popup is cancelled before authorization or sync", async () => {
    const popupCancellation = new Error("popup_closed");
    const requestDriveAuthorization = vi.fn(async () => {
      throw popupCancellation;
    });
    const authorizeGoogleDrive = vi.fn(async () => ({ authorized: true }));
    const afterDriveAuthorization = vi.fn(async () => undefined);
    const syncArchive = vi.fn(async () => ({
      attempted: 0,
      synced: 0,
      failed: 0,
      skippedNonRetryable: 0
    }));

    await expect(
      runArchiveSyncFlow({
        persistence: {
          ...initialPersistenceViewState(),
          googleAccount: "connected",
          driveArchive: "reauthorization_required"
        },
        origin: "https://wanderloom.test",
        dependencies: {
          requestDriveAuthorization,
          authorizeGoogleDrive,
          afterDriveAuthorization,
          syncArchive
        }
      })
    ).rejects.toBe(popupCancellation);

    expect(requestDriveAuthorization).toHaveBeenCalledOnce();
    expect(authorizeGoogleDrive).not.toHaveBeenCalled();
    expect(afterDriveAuthorization).not.toHaveBeenCalled();
    expect(syncArchive).not.toHaveBeenCalled();
  });
});
