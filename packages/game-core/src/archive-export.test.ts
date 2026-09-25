import { describe, expect, it } from "vitest";
import {
  ARCHIVE_EXPORT_KIND,
  ARCHIVE_EXPORT_VERSION,
  archiveExportId,
  archiveExportIdempotencyKey,
  createArchiveExportEnvelope,
  initialArchiveExportLifecycle,
  isArchiveExportEnvelopeV1,
  markArchiveExportFailed,
  markArchiveExportSynced,
  parseArchiveExport,
  serializeArchiveExport,
  type ExplorationArchiveEntry,
  type ExplorationId,
  type ItemDefinitionId,
  type ItemInstanceId,
  type PlayerId,
  type ZoneId
} from "./index";

const entry: ExplorationArchiveEntry = {
  schemaVersion: 1,
  playerId: "player-export" as PlayerId,
  explorationId: "exploration-export" as ExplorationId,
  zoneId: "m1-smoke-frontier" as ZoneId,
  durationId: "short",
  startedAt: "2026-09-25T00:00:00.000Z",
  endedAt: "2026-09-25T00:05:00.000Z",
  claimedAt: "2026-09-25T00:05:01.000Z",
  result: "success",
  rewards: {
    gold: 6,
    exp: 10,
    drops: [
      {
        itemInstanceId: "item-export" as ItemInstanceId,
        itemDefinitionId: "m1-wayfarer-charm" as ItemDefinitionId,
        createdAt: "2026-09-25T00:05:01.000Z"
      }
    ]
  },
  summaryMetrics: {
    generatedGold: 6,
    retainedGold: 6
  },
  sync: {
    status: "pending",
    syncedAt: null
  }
};

describe("CP-32 archive export contract", () => {
  it("creates an immutable v1 envelope without mutable sync metadata", () => {
    const envelope = createArchiveExportEnvelope(entry);

    expect(envelope).toEqual({
      kind: ARCHIVE_EXPORT_KIND,
      exportVersion: ARCHIVE_EXPORT_VERSION,
      archiveId: "exploration:player-export:exploration-export",
      idempotencyKey:
        "wanderloom:archive:v1:player-export:exploration-export",
      record: {
        schemaVersion: 1,
        playerId: "player-export",
        explorationId: "exploration-export",
        zoneId: "m1-smoke-frontier",
        durationId: "short",
        startedAt: "2026-09-25T00:00:00.000Z",
        endedAt: "2026-09-25T00:05:00.000Z",
        claimedAt: "2026-09-25T00:05:01.000Z",
        result: "success",
        rewards: entry.rewards,
        summaryMetrics: entry.summaryMetrics
      }
    });

    expect("sync" in envelope.record).toBe(false);
  });

  it("uses stable provider-independent archive and idempotency identities", () => {
    expect(
      archiveExportId(entry.playerId, entry.explorationId)
    ).toBe("exploration:player-export:exploration-export");

    expect(
      archiveExportIdempotencyKey(entry.playerId, entry.explorationId)
    ).toBe("wanderloom:archive:v1:player-export:exploration-export");

    expect(createArchiveExportEnvelope(entry).idempotencyKey).toBe(
      createArchiveExportEnvelope({
        ...entry,
        sync: {
          status: "synced",
          syncedAt: "2026-09-25T00:06:00.000Z"
        }
      }).idempotencyKey
    );
  });

  it("round-trips the v1 fixture through pure JSON serialization", () => {
    const envelope = createArchiveExportEnvelope(entry);
    const serialized = serializeArchiveExport(envelope);

    expect(parseArchiveExport(serialized)).toEqual(envelope);
    expect(JSON.parse(serialized)).toEqual(envelope);
  });

  it("recognizes the supported v1 compatibility fixture", () => {
    expect(
      isArchiveExportEnvelopeV1(createArchiveExportEnvelope(entry))
    ).toBe(true);
  });

  it("rejects unknown future export versions", () => {
    const future = {
      ...createArchiveExportEnvelope(entry),
      exportVersion: 2
    };

    expect(isArchiveExportEnvelopeV1(future)).toBe(false);
    expect(() =>
      parseArchiveExport(JSON.stringify(future))
    ).toThrow(RangeError);
  });

  it("rejects malformed envelopes instead of silently accepting them", () => {
    const malformed = {
      ...createArchiveExportEnvelope(entry),
      record: {
        playerId: "player-export"
      }
    };

    expect(isArchiveExportEnvelopeV1(malformed)).toBe(false);
    expect(() =>
      parseArchiveExport(JSON.stringify(malformed))
    ).toThrow(RangeError);
  });

  it("rejects envelopes whose immutable identity does not match the record", () => {
    const mismatched = {
      ...createArchiveExportEnvelope(entry),
      archiveId: "exploration:another-player:another-exploration"
    };

    expect(isArchiveExportEnvelopeV1(mismatched)).toBe(false);
  });

  it("models pending to error to synced retry lifecycle", () => {
    const pending = initialArchiveExportLifecycle();
    expect(pending).toEqual({
      status: "pending",
      lastAttemptAt: null,
      attemptCount: 0
    });

    const failed = markArchiveExportFailed({
      previous: pending,
      attemptedAt: "2026-09-25T00:06:00.000Z",
      retryable: true,
      code: "temporary_provider_error"
    });
    expect(failed).toEqual({
      status: "error",
      lastAttemptAt: "2026-09-25T00:06:00.000Z",
      attemptCount: 1,
      retryable: true,
      code: "temporary_provider_error"
    });

    expect(
      markArchiveExportSynced({
        previous: failed,
        syncedAt: "2026-09-25T00:07:00.000Z",
        remoteId: "drive-file-1"
      })
    ).toEqual({
      status: "synced",
      syncedAt: "2026-09-25T00:07:00.000Z",
      attemptCount: 2,
      remoteId: "drive-file-1"
    });
  });

  it("does not allow a synced export to regress to error", () => {
    const synced = markArchiveExportSynced({
      previous: initialArchiveExportLifecycle(),
      syncedAt: "2026-09-25T00:06:00.000Z",
      remoteId: "drive-file-1"
    });

    expect(() =>
      markArchiveExportFailed({
        previous: synced,
        attemptedAt: "2026-09-25T00:07:00.000Z",
        retryable: true,
        code: "late_error"
      })
    ).toThrow(RangeError);

    expect(
      markArchiveExportSynced({
        previous: synced,
        syncedAt: "2026-09-25T00:08:00.000Z",
        remoteId: "different-remote-id"
      })
    ).toEqual(synced);
  });
});
