import type { PersistenceViewState } from "./persistence-state";
import type { ArchiveSyncResult } from "./archive-sync-flow";

export interface BestEffortArchiveSyncDependencies {
  readonly syncArchive: () => Promise<ArchiveSyncResult>;
  readonly refreshDriveStatus: () => Promise<unknown>;
}

export type BestEffortArchiveSyncOutcome =
  | { readonly attempted: false; readonly reason: "authorization_unavailable" }
  | { readonly attempted: true; readonly ok: true; readonly result: ArchiveSyncResult }
  | { readonly attempted: true; readonly ok: false; readonly error: unknown };

export function shouldTriggerBestEffortArchiveSync(
  persistence: PersistenceViewState
): boolean {
  return (
    persistence.driveArchive === "connected" ||
    persistence.driveArchive === "temporarily_unavailable"
  );
}

export async function runBestEffortArchiveSync(input: {
  readonly persistence: PersistenceViewState;
  readonly dependencies: BestEffortArchiveSyncDependencies;
}): Promise<BestEffortArchiveSyncOutcome> {
  if (!shouldTriggerBestEffortArchiveSync(input.persistence)) {
    return {
      attempted: false,
      reason: "authorization_unavailable"
    };
  }

  try {
    const result = await input.dependencies.syncArchive();
    await input.dependencies.refreshDriveStatus();
    return {
      attempted: true,
      ok: true,
      result
    };
  } catch (error) {
    try {
      await input.dependencies.refreshDriveStatus();
    } catch {
      // Status refresh is also best-effort. Claim state must remain authoritative.
    }

    return {
      attempted: true,
      ok: false,
      error
    };
  }
}
