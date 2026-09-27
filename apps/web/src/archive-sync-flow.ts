import { chooseArchiveAuthorizationAction } from "./archive-authorization-reuse";
import type { PersistenceViewState } from "./persistence-state";

export interface ArchiveSyncResult {
  readonly attempted: number;
  readonly synced: number;
  readonly failed: number;
  readonly skippedNonRetryable: number;
}

export interface ArchiveSyncFlowDependencies {
  readonly requestDriveAuthorization: () => Promise<string>;
  readonly authorizeGoogleDrive: (
    code: string,
    origin: string
  ) => Promise<unknown>;
  readonly afterDriveAuthorization: () => Promise<unknown>;
  readonly syncArchive: () => Promise<ArchiveSyncResult>;
}

export async function runArchiveSyncFlow(input: {
  readonly persistence: PersistenceViewState;
  readonly origin: string;
  readonly dependencies: ArchiveSyncFlowDependencies;
}): Promise<ArchiveSyncResult> {
  const action = chooseArchiveAuthorizationAction(input.persistence);

  if (action === "request_authorization") {
    const code = await input.dependencies.requestDriveAuthorization();
    await input.dependencies.authorizeGoogleDrive(code, input.origin);
    await input.dependencies.afterDriveAuthorization();
  }

  return input.dependencies.syncArchive();
}
