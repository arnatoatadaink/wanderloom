import type { PlayerId } from "@wanderloom/game-core";
import type {
  D1GoogleDriveAuthorizationRepository,
  GoogleDriveAuthorization
} from "../persistence/d1-google-drive-authorization-repository";

export type GoogleDriveConnectionState =
  | "not_connected"
  | "connected"
  | "reauthorization_required";

export interface GoogleDriveConnectionStatus {
  readonly state: GoogleDriveConnectionState;
  readonly grantedScope: string | null;
  readonly authorizedAt: string | null;
  readonly updatedAt: string | null;
}

export interface GoogleDriveAuthorizationReader {
  findByPlayerId(
    playerId: PlayerId
  ): Promise<GoogleDriveAuthorization | null>;
}

export async function getGoogleDriveConnectionStatus(input: {
  readonly playerId: PlayerId;
  readonly repository:
    | D1GoogleDriveAuthorizationRepository
    | GoogleDriveAuthorizationReader;
}): Promise<GoogleDriveConnectionStatus> {
  const authorization = await input.repository.findByPlayerId(input.playerId);

  if (authorization === null) {
    return {
      state: "not_connected",
      grantedScope: null,
      authorizedAt: null,
      updatedAt: null
    };
  }

  return {
    state: "connected",
    grantedScope: authorization.grantedScope,
    authorizedAt: authorization.authorizedAt,
    updatedAt: authorization.updatedAt
  };
}
