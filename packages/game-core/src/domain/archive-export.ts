import type {
  ExplorationArchiveEntry,
  RewardSummary
} from "./archive";
import type { IsoDateTime } from "./core-snapshot";
import type {
  ExplorationId,
  PlayerId,
  ZoneId
} from "./ids";

export const ARCHIVE_EXPORT_KIND =
  "wanderloom.exploration_archive" as const;
export const ARCHIVE_EXPORT_VERSION = 1 as const;

export interface ArchiveExportRecordV1 {
  readonly schemaVersion: number;
  readonly playerId: PlayerId;
  readonly explorationId: ExplorationId;
  readonly zoneId: ZoneId;
  readonly durationId: string;
  readonly startedAt: IsoDateTime;
  readonly endedAt: IsoDateTime;
  readonly claimedAt: IsoDateTime;
  readonly result: string;
  readonly rewards: RewardSummary;
  readonly summaryMetrics: Readonly<Record<string, number>>;
}

export interface ArchiveExportEnvelopeV1 {
  readonly kind: typeof ARCHIVE_EXPORT_KIND;
  readonly exportVersion: typeof ARCHIVE_EXPORT_VERSION;
  /**
   * Stable immutable identity for one logical archive record.
   * It is deliberately independent from storage-provider file IDs.
   */
  readonly archiveId: string;
  /**
   * Stable key reused across retries so adapters can converge duplicate
   * delivery attempts onto one logical record.
   */
  readonly idempotencyKey: string;
  readonly record: ArchiveExportRecordV1;
}

export type ArchiveExportEnvelope = ArchiveExportEnvelopeV1;

export type ArchiveExportLifecycle =
  | {
      readonly status: "pending";
      readonly lastAttemptAt: IsoDateTime | null;
      readonly attemptCount: number;
    }
  | {
      readonly status: "synced";
      readonly syncedAt: IsoDateTime;
      readonly attemptCount: number;
      readonly remoteId: string;
    }
  | {
      readonly status: "error";
      readonly lastAttemptAt: IsoDateTime;
      readonly attemptCount: number;
      readonly retryable: boolean;
      readonly code: string;
    };

export function archiveExportId(
  playerId: PlayerId,
  explorationId: ExplorationId
): string {
  return `exploration:${playerId}:${explorationId}`;
}

export function archiveExportIdempotencyKey(
  playerId: PlayerId,
  explorationId: ExplorationId
): string {
  return `wanderloom:archive:v${ARCHIVE_EXPORT_VERSION}:${playerId}:${explorationId}`;
}

/**
 * Converts gameplay-authoritative D1 archive state into immutable historical
 * export data. Mutable sync metadata is intentionally excluded.
 */
export function createArchiveExportEnvelope(
  entry: ExplorationArchiveEntry
): ArchiveExportEnvelopeV1 {
  const archiveId = archiveExportId(
    entry.playerId,
    entry.explorationId
  );

  return {
    kind: ARCHIVE_EXPORT_KIND,
    exportVersion: ARCHIVE_EXPORT_VERSION,
    archiveId,
    idempotencyKey: archiveExportIdempotencyKey(
      entry.playerId,
      entry.explorationId
    ),
    record: {
      schemaVersion: entry.schemaVersion,
      playerId: entry.playerId,
      explorationId: entry.explorationId,
      zoneId: entry.zoneId,
      durationId: entry.durationId,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      claimedAt: entry.claimedAt,
      result: entry.result,
      rewards: entry.rewards,
      summaryMetrics: entry.summaryMetrics
    }
  };
}

export function serializeArchiveExport(
  envelope: ArchiveExportEnvelope
): string {
  return JSON.stringify(envelope);
}

export function parseArchiveExport(
  serialized: string
): ArchiveExportEnvelope {
  const value = JSON.parse(serialized) as unknown;
  if (!isArchiveExportEnvelopeV1(value)) {
    throw new RangeError("unsupported or invalid archive export envelope");
  }
  return value;
}

export function isArchiveExportEnvelopeV1(
  value: unknown
): value is ArchiveExportEnvelopeV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const envelope = value as Partial<ArchiveExportEnvelopeV1>;
  if (
    envelope.kind !== ARCHIVE_EXPORT_KIND ||
    envelope.exportVersion !== ARCHIVE_EXPORT_VERSION ||
    typeof envelope.archiveId !== "string" ||
    envelope.archiveId.length === 0 ||
    typeof envelope.idempotencyKey !== "string" ||
    envelope.idempotencyKey.length === 0 ||
    typeof envelope.record !== "object" ||
    envelope.record === null
  ) {
    return false;
  }

  const record = envelope.record as Partial<ArchiveExportRecordV1>;
  return (
    typeof record.schemaVersion === "number" &&
    typeof record.playerId === "string" &&
    record.playerId.length > 0 &&
    typeof record.explorationId === "string" &&
    record.explorationId.length > 0 &&
    typeof record.zoneId === "string" &&
    record.zoneId.length > 0 &&
    typeof record.durationId === "string" &&
    record.durationId.length > 0 &&
    typeof record.startedAt === "string" &&
    typeof record.endedAt === "string" &&
    typeof record.claimedAt === "string" &&
    typeof record.result === "string" &&
    typeof record.rewards === "object" &&
    record.rewards !== null &&
    typeof record.summaryMetrics === "object" &&
    record.summaryMetrics !== null
  );
}
