import type { ApiError } from "./api-client";

export type GoogleAccountConnectionState =
  | "unknown"
  | "guest"
  | "connected";

export type DriveArchiveConnectionState =
  | "unknown"
  | "not_connected"
  | "connected"
  | "reauthorization_required"
  | "temporarily_unavailable";

export interface PersistenceViewState {
  readonly googleAccount: GoogleAccountConnectionState;
  readonly driveArchive: DriveArchiveConnectionState;
  readonly driveGrantedScope: string | null;
  readonly driveAuthorizedAt: string | null;
  readonly driveUpdatedAt: string | null;
  readonly driveMessage: string | null;
}

export interface GoogleDriveConnectionStatusDto {
  readonly state:
    | "not_connected"
    | "connected"
    | "reauthorization_required";
  readonly grantedScope: string | null;
  readonly authorizedAt: string | null;
  readonly updatedAt: string | null;
}

export function initialPersistenceViewState(): PersistenceViewState {
  return {
    googleAccount: "unknown",
    driveArchive: "unknown",
    driveGrantedScope: null,
    driveAuthorizedAt: null,
    driveUpdatedAt: null,
    driveMessage: null
  };
}

export function applyDriveConnectionStatus(
  current: PersistenceViewState,
  status: GoogleDriveConnectionStatusDto
): PersistenceViewState {
  return {
    ...current,
    driveArchive: status.state,
    driveGrantedScope: status.grantedScope,
    driveAuthorizedAt: status.authorizedAt,
    driveUpdatedAt: status.updatedAt,
    driveMessage: null
  };
}

export function markDriveTemporarilyUnavailable(
  current: PersistenceViewState,
  message: string
): PersistenceViewState {
  return {
    ...current,
    driveArchive: "temporarily_unavailable",
    driveMessage: message
  };
}

export function describeDriveError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as ApiError).code === "string"
  ) {
    return (error as ApiError).code;
  }

  return error instanceof Error ? error.message : "Unknown Drive error";
}
