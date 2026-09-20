import type { PlayerId } from "@wanderloom/game-core";
import { D1CoreSnapshotRepository, type D1DatabaseLike } from "./persistence/d1-core-snapshot-repository";
import { D1InventorySnapshotRepository } from "./persistence/d1-inventory-snapshot-repository";
import { bootstrapGuestPlayer } from "./services/guest-bootstrap";

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
}

export interface ApiDatabase extends D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike & ReturnType<D1DatabaseLike["prepare"]>;
  batch(statements: D1PreparedStatementLike[]): Promise<readonly unknown[]>;
}

export interface ApiEnv {
  readonly DB: ApiDatabase;
}

export interface ApiRuntime {
  readonly now: () => string;
  readonly createPlayerId: () => PlayerId;
}

const defaultRuntime: ApiRuntime = {
  now: () => new Date().toISOString(),
  createPlayerId: () => crypto.randomUUID() as PlayerId
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function getPlayerId(request: Request): PlayerId | null {
  const value = request.headers.get("x-wanderloom-player-id");
  return value === null || value.length === 0 ? null : (value as PlayerId);
}

function notReady(feature: string): Response {
  return json(
    {
      ok: false,
      error: {
        code: "not_ready",
        feature
      }
    },
    501
  );
}

export function createApi(runtime: ApiRuntime = defaultRuntime) {
  return {
    async fetch(request: Request, env: ApiEnv): Promise<Response> {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();

      if (method === "GET" && url.pathname === "/api/health") {
        return json({ ok: true });
      }

      if (method === "POST" && url.pathname === "/api/guest/bootstrap") {
        const result = await bootstrapGuestPlayer(env.DB, {
          playerId: runtime.createPlayerId(),
          createdAt: runtime.now()
        });

        return json(
          {
            ok: true,
            playerId: result.playerId,
            core: result.core,
            inventory: result.inventory
          },
          201
        );
      }

      const playerId = getPlayerId(request);
      if (playerId === null) {
        return json(
          {
            ok: false,
            error: {
              code: "missing_player_id"
            }
          },
          401
        );
      }

      const coreRepository = new D1CoreSnapshotRepository(env.DB);
      const inventoryRepository = new D1InventorySnapshotRepository(env.DB);

      if (method === "GET" && url.pathname === "/api/state") {
        const core = await coreRepository.findByPlayerId(playerId);
        return core === null
          ? json({ ok: false, error: { code: "player_not_found" } }, 404)
          : json({ ok: true, core });
      }

      if (method === "GET" && url.pathname === "/api/inventory") {
        const inventory = await inventoryRepository.findByPlayerId(playerId);
        return inventory === null
          ? json({ ok: false, error: { code: "player_not_found" } }, 404)
          : json({ ok: true, inventory });
      }

      if (
        method === "GET" &&
        url.pathname === "/api/explorations/current"
      ) {
        const core = await coreRepository.findByPlayerId(playerId);
        return core === null
          ? json({ ok: false, error: { code: "player_not_found" } }, 404)
          : json({
              ok: true,
              exploration: core.activeExploration
            });
      }

      if (method === "GET" && url.pathname === "/api/zones") {
        return notReady("zone_catalog");
      }

      if (method === "POST" && url.pathname === "/api/explorations") {
        return notReady("server_zone_duration_resolution");
      }

      if (
        method === "POST" &&
        /^\/api\/explorations\/[^/]+\/claim$/.test(url.pathname)
      ) {
        return notReady("exploration_resolution");
      }

      if (method === "POST" && url.pathname === "/api/equipment") {
        return notReady("equipment_mutation");
      }

      return json(
        {
          ok: false,
          error: {
            code: "not_found"
          }
        },
        404
      );
    }
  };
}
