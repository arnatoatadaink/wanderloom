import type { PersistenceViewState } from "./persistence-state";

export type ArchiveAuthorizationAction =
  | "reuse_existing_authorization"
  | "request_authorization";

export function chooseArchiveAuthorizationAction(
  persistence: PersistenceViewState
): ArchiveAuthorizationAction {
  return persistence.driveArchive === "not_connected" ||
    persistence.driveArchive === "reauthorization_required"
    ? "request_authorization"
    : "reuse_existing_authorization";
}
