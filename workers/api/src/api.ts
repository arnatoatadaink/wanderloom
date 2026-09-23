import {
  calculateClaim,
  equipItem,
  instantiateDrop,
  resolveSeededM1Exploration,
  resolveSeededExpedition,
  generateSeededRarityDrops,
  type ProgressionRule,
  type ZoneRewardConfiguration,
  type ActiveExploration,
  type ExplorationId,
  type ExplorationResolution,
  type ItemInstanceId,
  type PlayerId,
  type ZoneId
} from "@wanderloom/game-core";
import { D1AtomicMutationRepository, type D1AtomicDatabaseLike } from "./persistence/d1-atomic-mutation-repository";
import { D1CoreSnapshotRepository, type D1DatabaseLike } from "./persistence/d1-core-snapshot-repository";
import { D1InventorySnapshotRepository } from "./persistence/d1-inventory-snapshot-repository";
import { bootstrapGuestPlayer } from "./services/guest-bootstrap";
import {
  M1_SMOKE_RECENT_ARCHIVE_RETENTION,
  M1_SMOKE_ZONES,
  M2_SMOKE_ZONES,
  resolveM1SmokeDurationMs
} from "./m1-smoke-rules";
import { persistStartedExploration } from "./services/start-exploration-persistence";

export type ApiDatabase = D1DatabaseLike & D1AtomicDatabaseLike;

export interface ApiEnv {
  readonly DB: ApiDatabase;
}

export interface ApiRuntime {
  readonly now: () => string;
  readonly createPlayerId: () => PlayerId;
  readonly createExplorationId: () => ExplorationId;
  readonly createClaimNonce: () => string;
  readonly createSeed: () => string;
  readonly createItemInstanceId: () => ItemInstanceId;
  readonly resolveDurationMs: (
    zoneId: ZoneId,
    durationId: string
  ) => number | null;
  readonly resolveExploration: (
    exploration: ActiveExploration,
    claimedAt: string,
    createItemInstanceId: () => ItemInstanceId
  ) => ExplorationResolution | null;
  readonly recentArchiveRetention: number | null;
  readonly progressionRule?: ProgressionRule;
  readonly rewardConfiguration?: ZoneRewardConfiguration;
}

const defaultRuntime: ApiRuntime = {
  now: () => new Date().toISOString(),
  createPlayerId: () => crypto.randomUUID() as PlayerId,
  createExplorationId: () => crypto.randomUUID() as ExplorationId,
  createClaimNonce: () => crypto.randomUUID(),
  createSeed: () => crypto.randomUUID(),
  createItemInstanceId: () => crypto.randomUUID() as ItemInstanceId,
  resolveDurationMs: resolveM1SmokeDurationMs,
  resolveExploration: (exploration, claimedAt, createItemInstanceId) => {
    const resolved = resolveSeededM1Exploration({
      seed: exploration.seed,
      explorationId: exploration.explorationId,
      zoneId: exploration.zoneId,
      durationId: exploration.durationId
    });

    return {
      result: resolved.result,
      gold: resolved.gold,
      exp: resolved.exp,
      drops: resolved.generatedDrops.map((generatedDrop) =>
        instantiateDrop({
          generatedDrop,
          itemInstanceId: createItemInstanceId(),
          createdAt: claimedAt
        })
      ),
      summaryMetrics: resolved.summaryMetrics
    };
  },
  recentArchiveRetention: M1_SMOKE_RECENT_ARCHIVE_RETENTION
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

function mutationErrorStatus(code: string): number {
  return code === "version_conflict" || code === "already_claimed" ? 409 : 400;
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

      if (method === "GET" && url.pathname === "/api/explorations/current") {
        const core = await coreRepository.findByPlayerId(playerId);
        return core === null
          ? json({ ok: false, error: { code: "player_not_found" } }, 404)
          : json({ ok: true, exploration: core.activeExploration });
      }

      if (method === "GET" && url.pathname === "/api/zones") {
        return json({
          ok: true,
          zones: M2_SMOKE_ZONES
        });
      }

      if (method === "POST" && url.pathname === "/api/explorations") {
        const core = await coreRepository.findByPlayerId(playerId);
        if (core === null) {
          return json({ ok: false, error: { code: "player_not_found" } }, 404);
        }

        const body = (await request.json()) as {
          readonly zoneId?: string;
          readonly durationId?: string;
        };
        if (!body.zoneId || !body.durationId) {
          return json({ ok: false, error: { code: "invalid_request" } }, 400);
        }

        const zoneId = body.zoneId as ZoneId;
        const durationMs = runtime.resolveDurationMs(zoneId, body.durationId);
        if (durationMs === null) {
          return notReady("server_zone_duration_resolution");
        }

        const inventory = runtime.rewardConfiguration
      ? await inventoryRepository.findByPlayerId(playerId)
      : null;
    const result = await persistStartedExploration(coreRepository, {
          player: core,
          zoneId,
          durationId: body.durationId,
          durationMs,
          explorationId: runtime.createExplorationId(),
          claimNonce: runtime.createClaimNonce(),
          seed: runtime.createSeed(),
          startedAt: runtime.now(),
          ...(inventory ? { inventory, equipmentEffectDefinitions: [] } : {})
        });

        return result.ok
          ? json({ ok: true, core: result.value }, 201)
          : json(
              { ok: false, error: result.error },
              mutationErrorStatus(result.error.code)
            );
      }

      const claimMatch = url.pathname.match(
        /^\/api\/explorations\/([^/]+)\/claim$/
      );
      if (method === "POST" && claimMatch !== null) {
        const requestedExplorationId = claimMatch[1] as ExplorationId;
        const [core, inventory] = await Promise.all([
          coreRepository.findByPlayerId(playerId),
          inventoryRepository.findByPlayerId(playerId)
        ]);

        if (core === null || inventory === null) {
          return json({ ok: false, error: { code: "player_not_found" } }, 404);
        }

        const exploration = core.activeExploration;
        if (
          exploration === null ||
          exploration.explorationId !== requestedExplorationId
        ) {
          const claimed = await env.DB
            .prepare(
              `SELECT claimed_at
               FROM recent_archive
               WHERE player_id = ?1
                 AND exploration_id = ?2
               LIMIT 1`
            )
            .bind(playerId, requestedExplorationId)
            .first<{ claimed_at: string }>();

          if (claimed !== null) {
            return json(
              {
                ok: false,
                error: {
                  code: "already_claimed",
                  explorationId: requestedExplorationId,
                  claimedAt: claimed.claimed_at
                }
              },
              409
            );
          }

          return json(
            {
              ok: false,
              error: {
                code: "invalid_exploration_state",
                explorationId: requestedExplorationId,
                actualState: exploration === null ? "idle" : "different_exploration",
                allowedStates: ["ready_to_claim"]
              }
            },
            400
          );
        }

        const claimedAt = runtime.now();
        const resolution = runtime.resolveExploration(
          exploration,
          claimedAt,
          runtime.createItemInstanceId
        );
        if (resolution === null) {
          return notReady("exploration_resolution");
        }

        const calculated = calculateClaim({
          core,
          inventory,
          exploration,
          resolution,
          claimedAt,
          progressionRule: runtime.progressionRule
        });
        if (!calculated.ok) {
          return json(
            { ok: false, error: calculated.error },
            mutationErrorStatus(calculated.error.code)
          );
        }

        if (runtime.recentArchiveRetention === null) {
          return notReady("recent_archive_retention_policy");
        }

        const atomicRepository = new D1AtomicMutationRepository(env.DB, {
          recentArchiveRetention: runtime.recentArchiveRetention
        });
        const committed = await atomicRepository.commit({
          kind: "claim",
          playerId,
          claimNonce: exploration.claimNonce,
          expectedCoreStateVersion: calculated.value.previousCoreStateVersion,
          nextCore: calculated.value.nextCore,
          expectedInventoryStateVersion:
            calculated.value.previousInventoryStateVersion,
          nextInventory: calculated.value.nextInventory,
          archiveEntry: calculated.value.archiveEntry
        });

        return committed.ok
          ? json({
              ok: true,
              commit: committed.value,
              core: calculated.value.nextCore,
              inventory: calculated.value.nextInventory,
              archiveEntry: calculated.value.archiveEntry
            })
          : json(
              { ok: false, error: committed.error },
              mutationErrorStatus(committed.error.code)
            );
      }

      if (method === "POST" && url.pathname === "/api/equipment") {
        const inventory = await inventoryRepository.findByPlayerId(playerId);
        if (inventory === null) {
          return json({ ok: false, error: { code: "player_not_found" } }, 404);
        }

        const body = (await request.json()) as {
          readonly slot?: string;
          readonly itemInstanceId?: string;
          readonly expectedInventoryStateVersion?: number;
        };
        if (
          !body.slot ||
          !body.itemInstanceId ||
          !Number.isInteger(body.expectedInventoryStateVersion)
        ) {
          return json({ ok: false, error: { code: "invalid_request" } }, 400);
        }

        const itemInstanceId = body.itemInstanceId as ItemInstanceId;
        if (inventory.equipment.slots[body.slot] === itemInstanceId) {
          return json({ ok: true, inventory, idempotent: true });
        }

        if (inventory.stateVersion !== body.expectedInventoryStateVersion) {
          return json({
            ok: false,
            error: {
              code: "version_conflict",
              snapshot: "inventory",
              expectedVersion: body.expectedInventoryStateVersion,
              actualVersion: inventory.stateVersion
            }
          }, 409);
        }

        const equipped = equipItem({
          inventory,
          slot: body.slot,
          itemInstanceId,
          equippedAt: runtime.now()
        });
        if (!equipped.ok) {
          return json({ ok: false, error: equipped.error }, 400);
        }

        const atomicRepository = new D1AtomicMutationRepository(env.DB, {
          recentArchiveRetention: runtime.recentArchiveRetention ?? 1
        });
        const committed = await atomicRepository.commit({
          kind: "inventory",
          playerId,
          expectedInventoryStateVersion:
            equipped.value.previousInventoryStateVersion,
          nextInventory: equipped.value.nextInventory
        });

        return committed.ok
          ? json({
              ok: true,
              inventory: equipped.value.nextInventory,
              idempotent: false
            })
          : json(
              { ok: false, error: committed.error },
              mutationErrorStatus(committed.error.code)
            );
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
