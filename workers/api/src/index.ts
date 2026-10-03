import type { PlayerId } from "@wanderloom/game-core";
import { createApi, type ApiEnv } from "./api";
import { D1CoreSnapshotRepository } from "./persistence/d1-core-snapshot-repository";
import { D1GoogleDriveAuthorizationRepository } from "./persistence/d1-google-drive-authorization-repository";
import { buildProductionZoneApiResponse } from "./production-zone-api-response";
import { getGoogleDriveConnectionStatus } from "./services/get-google-drive-connection-status";
import { syncGoogleDriveArchive } from "./services/sync-google-drive-archive";

const api = createApi();

function missingPlayerResponse(): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code: "missing_player_id",
        retryable: false
      }
    },
    { status: 400 }
  );
}

function playerNotFoundResponse(): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code: "player_not_found",
        retryable: false
      }
    },
    { status: 404 }
  );
}

export default {
  async fetch(request: Request, env: ApiEnv): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (
      method === "GET" &&
      url.pathname === "/api/archive/google/status"
    ) {
      const playerIdHeader = request.headers.get("x-wanderloom-player-id");
      if (!playerIdHeader) {
        return missingPlayerResponse();
      }

      const status = await getGoogleDriveConnectionStatus({
        playerId: playerIdHeader as PlayerId,
        repository: new D1GoogleDriveAuthorizationRepository(env.DB)
      });

      return Response.json({
        ok: true,
        connection: status
      });
    }

    if (method === "GET" && url.pathname === "/api/zones") {
      const playerIdHeader = request.headers.get("x-wanderloom-player-id");
      if (!playerIdHeader) {
        return missingPlayerResponse();
      }

      const core = await new D1CoreSnapshotRepository(env.DB).findByPlayerId(
        playerIdHeader as PlayerId
      );
      if (core === null) {
        return playerNotFoundResponse();
      }

      return Response.json(buildProductionZoneApiResponse(core));
    }

    if (method === "POST" && url.pathname === "/api/archive/sync") {
      const playerIdHeader = request.headers.get("x-wanderloom-player-id");
      if (!playerIdHeader) {
        return missingPlayerResponse();
      }

      return syncGoogleDriveArchive({
        playerId: playerIdHeader as PlayerId,
        env
      });
    }

    return api.fetch(request, env);
  }
};
