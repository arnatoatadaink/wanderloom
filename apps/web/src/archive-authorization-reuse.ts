import type { PersistenceViewState } from "./persistence-state";

export type ArchiveAuthorizationAction =
  | "reuse_existing_authorization"
  | "request_authorization";

export function chooseArchiveAuthorizationAction(
  persistence: PersistenceViewState
): ArchiveAuthorizationAction {
  return persistence.driveArchive === "connected"
    ? "reuse_existing_authorization"
    : "request_authorization";
}
