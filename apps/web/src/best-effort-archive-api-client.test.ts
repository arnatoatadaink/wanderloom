import { describe, expect, it, vi } from "vitest";

import { BestEffortArchiveApiClient } from "./best-effort-archive-api-client";

function response(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

const claimBody = {
  ok: true,
  core: {
    stateVersion: 2,
    progression: { level: 1, exp: 10, gold: 6 },
    activeExploration: null
  },
  inventory: {
    stateVersion: 2,
    equipment: { slots: {} },
    items: []
  },
  archiveEntry: {
    result: "success",
    rewards: { gold: 6, exp: 10, drops: [] }
  }
};

describe("CP-41 app archive sync client", () => {
  it("returns the claim result without waiting for archive sync", async () => {
    let releaseSync!: () => void;
    const syncGate = new Promise<void>((resolve) => {
      releaseSync = resolve;
    });
    const calls: string[] = [];

    const client = new BestEffortArchiveApiClient(async (input) => {
      const path = String(input);
      calls.push(path);
      if (path === "/api/archive/google/status") {
        return response({
          ok: true,
          connection: {
            state: "connected",
            grantedScope: "drive.appdata",
            authorizedAt: "2026-09-27T01:00:00.000Z",
            updatedAt: "2026-09-27T01:00:00.000Z"
          }
        });
      }
      if (path.endsWith("/claim")) {
        return response(claimBody);
      }
      if (path === "/api/archive/sync") {
        await syncGate;
        return response({
          ok: true,
          sync: {
            attempted: 1,
            synced: 1,
            failed: 0,
            skippedNonRetryable: 0
          }
        });
      }
      throw new Error(`unexpected request: ${path}`);
    }, "player-cp41");

    await client.getGoogleDriveConnectionStatus();
    const claimed = await client.claimExploration("exploration-cp41");

    expect(claimed.archiveEntry.result).toBe("success");
    expect(calls).toContain("/api/archive/sync");
    releaseSync();
  });

  it("does not auto-sync when cached Drive status requires reauthorization", async () => {
    const syncSeen = vi.fn();
    const client = new BestEffortArchiveApiClient(async (input) => {
      const path = String(input);
      if (path === "/api/archive/google/status") {
        return response({
          ok: true,
          connection: {
            state: "reauthorization_required",
            grantedScope: "drive.appdata",
            authorizedAt: "2026-09-27T01:00:00.000Z",
            updatedAt: "2026-09-27T01:00:00.000Z"
          }
        });
      }
      if (path.endsWith("/claim")) {
        return response(claimBody);
      }
      if (path === "/api/archive/sync") {
        syncSeen();
        return response({ ok: true, sync: {} });
      }
      throw new Error(`unexpected request: ${path}`);
    }, "player-cp41");

    await client.getGoogleDriveConnectionStatus();
    await client.claimExploration("exploration-cp41");
    await Promise.resolve();

    expect(syncSeen).not.toHaveBeenCalled();
  });

  it("keeps claim success authoritative when background sync fails", async () => {
    const client = new BestEffortArchiveApiClient(async (input) => {
      const path = String(input);
      if (path === "/api/archive/google/status") {
        return response({
          ok: true,
          connection: {
            state: "connected",
            grantedScope: "drive.appdata",
            authorizedAt: "2026-09-27T01:00:00.000Z",
            updatedAt: "2026-09-27T01:00:00.000Z"
          }
        });
      }
      if (path.endsWith("/claim")) {
        return response(claimBody);
      }
      if (path === "/api/archive/sync") {
        return response({
          ok: false,
          error: {
            code: "google_drive_provider_unavailable",
            retryable: true
          }
        }, 503);
      }
      throw new Error(`unexpected request: ${path}`);
    }, "player-cp41");

    await client.getGoogleDriveConnectionStatus();
    await expect(
      client.claimExploration("exploration-cp41")
    ).resolves.toMatchObject({
      archiveEntry: { result: "success" }
    });
  });
});
