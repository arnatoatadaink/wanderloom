import type { PlayerId } from "@wanderloom/game-core";
import { apiError, apiErrorStatus, type ApiErrorCode } from "../api-contract";
import { GoogleDriveAppDataSink } from "../google-drive-appdata-sink";
import { classifyGoogleOAuthFailure } from "../google-oauth-error-classification";
import { GoogleOAuthClient } from "../google-oauth";
import { AesGcmSecretCipher } from "../secret-cipher";
import { D1ArchiveExportRepository } from "../persistence/d1-archive-export-repository";
import { D1GoogleDriveAuthorizationRepository } from "../persistence/d1-google-drive-authorization-repository";
import { syncPlayerArchive } from "./sync-player-archive";
import type { ApiDatabase } from "../api";

export interface GoogleDriveSyncEnvironment {
  readonly DB: ApiDatabase;
  readonly GOOGLE_CLIENT_ID?: string;
  readonly GOOGLE_CLIENT_SECRET?: string;
  readonly ARCHIVE_TOKEN_ENCRYPTION_KEY?: string;
}

function errorResponse(
  code: ApiErrorCode,
  details?: Readonly<Record<string, unknown>>
): Response {
  return Response.json(apiError(code, details), {
    status: apiErrorStatus(code)
  });
}

export async function syncGoogleDriveArchive(input: {
  readonly playerId: PlayerId;
  readonly env: GoogleDriveSyncEnvironment;
  readonly oauthClient?: GoogleOAuthClient;
  readonly now?: () => string;
}): Promise<Response> {
  const {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
    ARCHIVE_TOKEN_ENCRYPTION_KEY: encryptionKey
  } = input.env;

  if (!clientId || !clientSecret || !encryptionKey) {
    return errorResponse("not_ready", { feature: "google_drive_sync" });
  }

  const authorizationRepository =
    new D1GoogleDriveAuthorizationRepository(input.env.DB);
  const authorization =
    await authorizationRepository.findByPlayerId(input.playerId);

  if (authorization === null) {
    return errorResponse("google_drive_not_authorized");
  }

  if (authorization.reauthorizationRequired) {
    return errorResponse("google_drive_reauthorization_required");
  }

  try {
    const cipher = new AesGcmSecretCipher(encryptionKey);
    const refreshToken = await cipher.decrypt({
      ciphertext: authorization.refreshTokenCiphertext,
      iv: authorization.refreshTokenIv
    });
    const tokens = await (input.oauthClient ?? new GoogleOAuthClient())
      .refreshAccessToken({
        refreshToken,
        clientId,
        clientSecret
      });

    const repository = new D1ArchiveExportRepository(input.env.DB);
    const sink = new GoogleDriveAppDataSink({
      accessToken: tokens.accessToken
    });
    const summary = await syncPlayerArchive({
      playerId: input.playerId,
      repository,
      sink,
      now: input.now ?? (() => new Date().toISOString()),
      limit: 10
    });

    return Response.json({
      ok: true,
      sync: summary
    });
  } catch (error) {
    const classification = classifyGoogleOAuthFailure(error);

    if (classification.kind === "reauthorization_required") {
      await authorizationRepository.markReauthorizationRequired({
        playerId: input.playerId,
        reason: classification.code,
        updatedAt: (input.now ?? (() => new Date().toISOString()))()
      });
      return errorResponse("google_drive_reauthorization_required", {
        reason: classification.code
      });
    }

    if (classification.kind === "provider_retryable") {
      return errorResponse("google_drive_provider_unavailable", {
        providerCode: classification.code
      });
    }

    return errorResponse("invalid_google_drive_authorization", {
      providerCode: classification.code
    });
  }
}
