import {
  type ArchiveExportSink,
  type ExplorationId,
  type PlayerId
} from "@wanderloom/game-core";
import {
  D1ArchiveExportRepository
} from "../persistence/d1-archive-export-repository";

export interface ArchiveSyncSummary {
  readonly attempted: number;
  readonly synced: number;
  readonly failed: number;
  readonly skippedNonRetryable: number;
}

export async function syncPlayerArchive(input: {
  readonly playerId: PlayerId;
  readonly repository: D1ArchiveExportRepository;
  readonly sink: ArchiveExportSink;
  readonly now: () => string;
  readonly limit: number;
}): Promise<ArchiveSyncSummary> {
  const pending = await input.repository.listPending(
    input.playerId,
    input.limit
  );

  let attempted = 0;
  let synced = 0;
  let failed = 0;
  let skippedNonRetryable = 0;

  for (const envelope of pending) {
    const explorationId =
      envelope.record.explorationId as ExplorationId;
    const state = await input.repository.findState(
      input.playerId,
      explorationId
    );

    if (
      state?.remoteId !== null &&
      state?.remoteId !== undefined
    ) {
      continue;
    }

    if (
      state?.lastErrorRetryable === false &&
      state.lastErrorCode !== null
    ) {
      skippedNonRetryable += 1;
      continue;
    }

    const leaseToken = crypto.randomUUID();
    const acquiredAt = input.now();
    const leaseUntil = new Date(
      new Date(acquiredAt).getTime() + 60_000
    ).toISOString();
    const acquired = await input.repository.acquireDeliveryLease({
      playerId: input.playerId,
      explorationId,
      leaseToken,
      acquiredAt,
      leaseUntil
    });

    if (!acquired) {
      continue;
    }

    attempted += 1;

    let result;
    try {
      result = await input.sink.deliver(envelope);
    } catch (error) {
      await input.repository.releaseDeliveryLease({
        playerId: input.playerId,
        explorationId,
        leaseToken
      });
      throw error;
    }

    const attemptedAt = input.now();

    if (!result.ok) {
      failed += 1;
      await input.repository.recordFailure({
        playerId: input.playerId,
        explorationId,
        attemptedAt,
        retryable: result.retryable,
        code: result.code,
        leaseToken
      });
      continue;
    }

    synced += 1;
    await input.repository.recordSuccess({
      playerId: input.playerId,
      explorationId,
      syncedAt: attemptedAt,
      remoteId: result.remoteId,
      leaseToken
    });
  }

  return {
    attempted,
    synced,
    failed,
    skippedNonRetryable
  };
}
