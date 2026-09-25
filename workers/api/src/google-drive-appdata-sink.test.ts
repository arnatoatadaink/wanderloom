import { describe, expect, it } from "vitest";
import {
  createArchiveExportEnvelope,
  type ExplorationArchiveEntry,
  type ExplorationId,
  type PlayerId,
  type ZoneId
} from "@wanderloom/game-core";
import { GoogleDriveAppDataSink } from "./google-drive-appdata-sink";

function envelope() {
  const entry: ExplorationArchiveEntry = {
    schemaVersion: 1,
    playerId: "player-drive" as PlayerId,
    explorationId: "exploration-drive" as ExplorationId,
    zoneId: "zone-drive" as ZoneId,
    durationId: "short",
    startedAt: "2026-09-25T00:00:00.000Z",
    endedAt: "2026-09-25T00:05:00.000Z",
    claimedAt: "2026-09-25T00:05:01.000Z",
    result: "success",
    rewards: { gold: 6, exp: 10, drops: [] },
    summaryMetrics: { retainedGold: 6 },
    sync: { status: "pending", syncedAt: null }
  };
  return createArchiveExportEnvelope(entry);
}

describe("GoogleDriveAppDataSink", () => {
  it("returns existing without creating a duplicate", async () => {
    const calls: string[] = [];
    const sink = new GoogleDriveAppDataSink({
      accessToken: "token",
      fetch: async (input) => {
        const url = String(input);
        calls.push(url);
        return Response.json({ files: [{ id: "drive-existing" }] });
      }
    });

    await expect(sink.deliver(envelope())).resolves.toEqual({
      ok: true,
      disposition: "existing",
      remoteId: "drive-existing"
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("spaces=appDataFolder");
    expect(decodeURIComponent(calls[0] ?? "")).toContain(
      "wanderloomArchiveKey"
    );
  });

  it("creates a JSON file in appDataFolder when no record exists", async () => {
    const requests: Array<{ url: string; init: RequestInit | undefined }> = [];
    const sink = new GoogleDriveAppDataSink({
      accessToken: "token",
      fetch: async (input, init) => {
        const url = String(input);
        requests.push({ url, init });
        if (
          url.startsWith("https://www.googleapis.com/drive/v3/files?")
        ) {
          return Response.json({ files: [] });
        }
        if (
          url.startsWith(
            "https://www.googleapis.com/upload/drive/v3/files?"
          )
        ) {
          return Response.json({ id: "drive-created" });
        }
        throw new Error(`unexpected Drive request: ${url}`);
      }
    });

    await expect(sink.deliver(envelope())).resolves.toEqual({
      ok: true,
      disposition: "created",
      remoteId: "drive-created"
    });

    expect(requests).toHaveLength(2);
    expect(requests[1]?.url).toContain(
      "/upload/drive/v3/files?uploadType=multipart"
    );
    expect(String(requests[1]?.init?.body)).toContain(
      '"parents":["appDataFolder"]'
    );
    expect(String(requests[1]?.init?.body)).toContain(
      '"wanderloomArchiveKey"'
    );
  });

  it("classifies transient Drive failures as retryable", async () => {
    const sink = new GoogleDriveAppDataSink({
      accessToken: "token",
      fetch: async () => new Response("", { status: 503 })
    });

    await expect(sink.deliver(envelope())).resolves.toEqual({
      ok: false,
      retryable: true,
      code: "drive_list_http_503"
    });
  });

  it("retains a safe Google reason for a Drive 403", async () => {
    const sink = new GoogleDriveAppDataSink({
      accessToken: "token",
      fetch: async () => Response.json({
        error: { errors: [{ reason: "accessNotConfigured" }] }
      }, { status: 403 })
    });

    await expect(sink.deliver(envelope())).resolves.toEqual({
      ok: false,
      retryable: false,
      code: "drive_list_http_403_accessNotConfigured"
    });
  });

  it("rejects duplicate remote archive identities", async () => {
    const sink = new GoogleDriveAppDataSink({
      accessToken: "token",
      fetch: async () =>
        Response.json({
          files: [{ id: "drive-1" }, { id: "drive-2" }]
        })
    });

    await expect(sink.deliver(envelope())).resolves.toEqual({
      ok: false,
      retryable: false,
      code: "drive_duplicate_archive_identity"
    });
  });
});
