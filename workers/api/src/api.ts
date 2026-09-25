import {
  calculateClaim,
  equipItem,
  instantiateDrop,
  resolveSeededExpedition,
  generateSeededRarityDrops,
  type EquipmentEffectDefinition,
  type ProgressionRule,
  type ZoneRewardConfiguration,
  type ActiveExploration,
  type ExplorationId,
  type ExplorationResolution,
  type ItemInstanceId,
  type MutationError,
  type PlayerId,
  type ZoneId
} from "@wanderloom/game-core";
import { D1AtomicMutationRepository, type D1AtomicDatabaseLike } from "./persistence/d1-atomic-mutation-repository";
import { D1CoreSnapshotRepository, type D1DatabaseLike } from "./persistence/d1-core-snapshot-repository";
import { D1InventorySnapshotRepository } from "./persistence/d1-inventory-snapshot-repository";
import { D1ExternalIdentityLinkRepository, type D1IdentityDatabaseLike } from "./persistence/d1-external-identity-link-repository";
import { bootstrapGuestPlayer } from "./services/guest-bootstrap";
import {
  M1_SMOKE_RECENT_ARCHIVE_RETENTION,
  M1_SMOKE_ZONES,
  M2_SMOKE_ZONES,
  M2_PREVIEW_LOSS_POLICY,
  M2_SMOKE_EQUIPMENT_EFFECT_DEFINITIONS,
  M2_SMOKE_PROGRESSION_RULE,
  M2_SMOKE_REWARD_CONFIGURATION,
  resolveM2SmokeDurationMs,
  resolveM2SmokeRewardConfiguration
} from "./m1-smoke-rules";
import { persistStartedExploration } from "./services/start-exploration-persistence";
import { linkGoogleAccount } from "./services/link-google-account";
import { GoogleJwksIdTokenVerifier, GoogleOidcVerificationError, type GoogleIdTokenVerifier } from "./google-oidc";
import { apiError, apiErrorStatus, type ApiErrorCode } from "./api-contract";
import { GoogleOAuthClient, GoogleOAuthExchangeError } from "./google-oauth";
import { GoogleDriveAppDataSink } from "./google-drive-appdata-sink";
import { AesGcmSecretCipher } from "./secret-cipher";
import {
  D1ArchiveExportRepository,
  type D1ArchiveExportDatabaseLike
} from "./persistence/d1-archive-export-repository";
import { D1GoogleDriveAuthorizationRepository } from "./persistence/d1-google-drive-authorization-repository";
import { syncPlayerArchive } from "./services/sync-player-archive";

export type ApiDatabase =
  D1DatabaseLike &
  D1AtomicDatabaseLike &
  D1IdentityDatabaseLike &
  D1ArchiveExportDatabaseLike;

export interface ApiEnv {
  readonly DB: ApiDatabase;
  readonly GOOGLE_CLIENT_ID?: string;
  readonly GOOGLE_CLIENT_SECRET?: string;
  readonly ARCHIVE_TOKEN_ENCRYPTION_KEY?: string;
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
  readonly equipmentEffectDefinitions?: readonly EquipmentEffectDefinition[];
  readonly googleIdTokenVerifier?: GoogleIdTokenVerifier;
  readonly googleOAuthClient?: GoogleOAuthClient;
}

const defaultRuntime: ApiRuntime = {
  now: () => new Date().toISOString(),
  createPlayerId: () => crypto.randomUUID() as PlayerId,
  createExplorationId: () => crypto.randomUUID() as ExplorationId,
  createClaimNonce: () => crypto.randomUUID(),
  createSeed: () => crypto.randomUUID(),
  createItemInstanceId: () => crypto.randomUUID() as ItemInstanceId,
  resolveDurationMs: resolveM2SmokeDurationMs,
  resolveExploration: (exploration, claimedAt, createItemInstanceId) => {
    const resolved = resolveSeededExpedition({
      seed: exploration.seed,
      explorationId: exploration.explorationId,
      zoneId: exploration.zoneId,
      durationId: exploration.durationId,
      config: {
        failureProbability: 0.25,
        lossPolicy: M2_PREVIEW_LOSS_POLICY
      }
    });
    const rewardConfiguration =
      resolveM2SmokeRewardConfiguration(exploration.zoneId);
    if (rewardConfiguration === null) {
      return null;
    }
    const generatedDrops = generateSeededRarityDrops({
      seed: exploration.seed,
      zoneId: exploration.zoneId,
      durationId: exploration.durationId,
      configuration: rewardConfiguration
    });
    const retainedDrops =
      resolved.result === "success" ||
      M2_PREVIEW_LOSS_POLICY.retainGeneratedDrops
        ? generatedDrops
        : [];

    return {
      result: resolved.result,
      gold: resolved.rewards.retainedGold,
      exp: resolved.rewards.retainedExp,
      drops: retainedDrops.map((generatedDrop) =>
        instantiateDrop({
          generatedDrop,
          itemInstanceId: createItemInstanceId(),
          createdAt: claimedAt
        })
      ),
      summaryMetrics: {
        ...resolved.summaryMetrics,
        generatedDropCount: generatedDrops.length,
        retainedDropCount: retainedDrops.length
      }
    };
  },
  recentArchiveRetention: M1_SMOKE_RECENT_ARCHIVE_RETENTION,
  progressionRule: M2_SMOKE_PROGRESSION_RULE,
  rewardConfiguration: M2_SMOKE_REWARD_CONFIGURATION,
  equipmentEffectDefinitions: M2_SMOKE_EQUIPMENT_EFFECT_DEFINITIONS,
  googleIdTokenVerifier: new GoogleJwksIdTokenVerifier(),
  googleOAuthClient: new GoogleOAuthClient()
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function getPlayerId(request: Request): PlayerId | null {
  const value = request.headers.get("x-wanderloom-player-id");
  return value === null || value.length === 0 ? null : (value as PlayerId);
}

function errorResponse(
  code: ApiErrorCode,
  details?: Readonly<Record<string, unknown>>
): Response {
  return json(apiError(code, details), apiErrorStatus(code));
}

function notReady(feature: string): Response {
  return errorResponse("not_ready", { feature });
}

function mutationErrorResponse(error: MutationError): Response {
  const { code, ...details } = error;
  return errorResponse(
    code,
    details as Readonly<Record<string, unknown>>
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

      if (method === "POST" && url.pathname === "/api/auth/google/restore") {
        if (!env.GOOGLE_CLIENT_ID || !runtime.googleIdTokenVerifier) {
          return notReady("google_oidc");
        }

        const body = (await request.json()) as {
          readonly credential?: string;
        };
        if (!body.credential) {
          return errorResponse("invalid_request");
        }

        try {
          const verified = await runtime.googleIdTokenVerifier.verify(
            body.credential,
            env.GOOGLE_CLIENT_ID
          );
          const identityRepository =
            new D1ExternalIdentityLinkRepository(env.DB);
          const link = await identityRepository.findByIdentity({
            provider: "google",
            subject: verified.subject
          });
          if (link === null) {
            return errorResponse("linked_account_not_found", {
              provider: "google"
            });
          }

          const coreRepository = new D1CoreSnapshotRepository(env.DB);
          const inventoryRepository =
            new D1InventorySnapshotRepository(env.DB);
          const [core, inventory] = await Promise.all([
            coreRepository.findByPlayerId(link.playerId),
            inventoryRepository.findByPlayerId(link.playerId)
          ]);
          if (core === null || inventory === null) {
            return errorResponse("player_not_found");
          }

          return json({
            ok: true,
            playerId: link.playerId,
            core,
            inventory
          });
        } catch (error) {
          if (error instanceof GoogleOidcVerificationError) {
            return errorResponse("invalid_google_credential");
          }
          throw error;
        }
      }

      const playerId = getPlayerId(request);
      if (playerId === null) {
        return errorResponse("missing_player_id");
      }

      if (method === "POST" && url.pathname === "/api/auth/google/link") {
        if (!env.GOOGLE_CLIENT_ID || !runtime.googleIdTokenVerifier) {
          return notReady("google_oidc");
        }

        const body = (await request.json()) as {
          readonly credential?: string;
        };
        if (!body.credential) {
          return errorResponse("invalid_request");
        }

        const repository = new D1ExternalIdentityLinkRepository(env.DB);
        try {
          const result = await linkGoogleAccount({
            playerId,
            credential: body.credential,
            clientId: env.GOOGLE_CLIENT_ID,
            linkedAt: runtime.now(),
            verifier: runtime.googleIdTokenVerifier,
            repository
          });

          if ("code" in result) {
            return errorResponse(result.code, result.details);
          }

          return json({
            ok: true,
            accountLink: result
          });
        } catch (error) {
          if (error instanceof GoogleOidcVerificationError) {
            return errorResponse("invalid_google_credential");
          }
          throw error;
        }
      }

      if (
        method === "POST" &&
        url.pathname === "/api/archive/google/authorize"
      ) {
        if (
          !env.GOOGLE_CLIENT_ID ||
          !env.GOOGLE_CLIENT_SECRET ||
          !env.ARCHIVE_TOKEN_ENCRYPTION_KEY ||
          !runtime.googleIdTokenVerifier ||
          !runtime.googleOAuthClient
        ) {
          return notReady("google_drive_oauth");
        }

        if (
          request.headers.get("x-requested-with") !== "XmlHttpRequest"
        ) {
          return errorResponse("invalid_request", {
            reason: "missing_requested_with"
          });
        }

        const body = (await request.json()) as {
          readonly code?: string;
          readonly redirectUri?: string;
        };
        if (!body.code || !body.redirectUri) {
          return errorResponse("invalid_request");
        }

        let redirectOrigin: string;
        try {
          const redirectUrl = new URL(body.redirectUri);
          redirectOrigin = redirectUrl.origin;
          if (redirectOrigin !== body.redirectUri) {
            return errorResponse("invalid_request", {
              reason: "redirect_uri_must_be_origin"
            });
          }
        } catch {
          return errorResponse("invalid_request", {
            reason: "invalid_redirect_uri"
          });
        }

        const requestOrigin = request.headers.get("origin");
        if (requestOrigin !== null && requestOrigin !== redirectOrigin) {
          return errorResponse("invalid_request", {
            reason: "origin_mismatch"
          });
        }

        const identityRepository =
          new D1ExternalIdentityLinkRepository(env.DB);
        const links = await identityRepository.listByPlayerId(playerId);
        const googleLink = links.find(
          (link) => link.identity.provider === "google"
        );
        if (!googleLink) {
          return errorResponse("linked_account_not_found", {
            provider: "google"
          });
        }

        try {
          const tokens = await runtime.googleOAuthClient.exchangeCode({
            code: body.code,
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            redirectUri: redirectOrigin
          });

          if (!tokens.idToken) {
            return errorResponse("invalid_google_drive_authorization", {
              reason: "missing_id_token"
            });
          }

          const verified = await runtime.googleIdTokenVerifier.verify(
            tokens.idToken,
            env.GOOGLE_CLIENT_ID
          );
          if (verified.subject !== googleLink.identity.subject) {
            return errorResponse("google_drive_identity_conflict", {
              provider: "google"
            });
          }

          const requiredScope =
            "https://www.googleapis.com/auth/drive.appdata";
          const scopes = new Set(
            tokens.scope.split(/\s+/).filter((scope) => scope.length > 0)
          );
          if (!scopes.has(requiredScope)) {
            return errorResponse("invalid_google_drive_authorization", {
              reason: "drive_appdata_scope_missing"
            });
          }

          const authorizationRepository =
            new D1GoogleDriveAuthorizationRepository(env.DB);
          const existing =
            await authorizationRepository.findByPlayerId(playerId);

          let encryptedRefreshToken:
            | { readonly ciphertext: string; readonly iv: string }
            | null = null;

          if (tokens.refreshToken !== null) {
            const cipher = new AesGcmSecretCipher(
              env.ARCHIVE_TOKEN_ENCRYPTION_KEY
            );
            encryptedRefreshToken =
              await cipher.encrypt(tokens.refreshToken);
          } else if (existing !== null) {
            encryptedRefreshToken = {
              ciphertext: existing.refreshTokenCiphertext,
              iv: existing.refreshTokenIv
            };
          }

          if (encryptedRefreshToken === null) {
            return errorResponse(
              "google_drive_offline_access_required"
            );
          }

          await authorizationRepository.upsert({
            playerId,
            refreshTokenCiphertext:
              encryptedRefreshToken.ciphertext,
            refreshTokenIv: encryptedRefreshToken.iv,
            grantedScope: tokens.scope,
            authorizedAt: runtime.now()
          });

          await new D1ArchiveExportRepository(env.DB)
            .retryAfterAuthorization(playerId);

          return json({
            ok: true,
            authorized: true,
            scope: tokens.scope
          });
        } catch (error) {
          if (
            error instanceof GoogleOAuthExchangeError ||
            error instanceof GoogleOidcVerificationError
          ) {
            return errorResponse(
              "invalid_google_drive_authorization"
            );
          }
          throw error;
        }
      }

      if (
        method === "POST" &&
        url.pathname === "/api/archive/sync"
      ) {
        if (
          !env.GOOGLE_CLIENT_ID ||
          !env.GOOGLE_CLIENT_SECRET ||
          !env.ARCHIVE_TOKEN_ENCRYPTION_KEY ||
          !runtime.googleOAuthClient
        ) {
          return notReady("google_drive_sync");
        }

        const authorizationRepository =
          new D1GoogleDriveAuthorizationRepository(env.DB);
        const authorization =
          await authorizationRepository.findByPlayerId(playerId);
        if (authorization === null) {
          return errorResponse("google_drive_not_authorized");
        }

        try {
          const cipher = new AesGcmSecretCipher(
            env.ARCHIVE_TOKEN_ENCRYPTION_KEY
          );
          const refreshToken = await cipher.decrypt({
            ciphertext: authorization.refreshTokenCiphertext,
            iv: authorization.refreshTokenIv
          });
          const tokens =
            await runtime.googleOAuthClient.refreshAccessToken({
              refreshToken,
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET
            });

          const repository =
            new D1ArchiveExportRepository(env.DB);
          const sink = new GoogleDriveAppDataSink({
            accessToken: tokens.accessToken
          });
          const summary = await syncPlayerArchive({
            playerId,
            repository,
            sink,
            now: runtime.now,
            limit: 10
          });

          return json({
            ok: true,
            sync: summary
          });
        } catch (error) {
          if (error instanceof GoogleOAuthExchangeError) {
            return errorResponse(
              "invalid_google_drive_authorization"
            );
          }
          throw error;
        }
      }

      const coreRepository = new D1CoreSnapshotRepository(env.DB);
      const inventoryRepository = new D1InventorySnapshotRepository(env.DB);

      if (method === "GET" && url.pathname === "/api/state") {
        const core = await coreRepository.findByPlayerId(playerId);
        return core === null
          ? errorResponse("player_not_found")
          : json({ ok: true, core });
      }

      if (method === "GET" && url.pathname === "/api/inventory") {
        const inventory = await inventoryRepository.findByPlayerId(playerId);
        return inventory === null
          ? errorResponse("player_not_found")
          : json({ ok: true, inventory });
      }

      if (method === "GET" && url.pathname === "/api/explorations/current") {
        const core = await coreRepository.findByPlayerId(playerId);
        return core === null
          ? errorResponse("player_not_found")
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
          return errorResponse("player_not_found");
        }

        const body = (await request.json()) as {
          readonly zoneId?: string;
          readonly durationId?: string;
        };
        if (!body.zoneId || !body.durationId) {
          return errorResponse("invalid_request");
        }

        const zoneId = body.zoneId as ZoneId;
        const durationMs = runtime.resolveDurationMs(zoneId, body.durationId);
        if (durationMs === null) {
          return notReady("server_zone_duration_resolution");
        }

        const shouldFreezeCharacter =
          runtime.rewardConfiguration !== undefined ||
          runtime.equipmentEffectDefinitions !== undefined;
        const inventory = shouldFreezeCharacter
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
          ...(inventory
            ? {
                inventory,
                equipmentEffectDefinitions:
                  runtime.equipmentEffectDefinitions ?? []
              }
            : {})
        });

        return result.ok
          ? json({ ok: true, core: result.value }, 201)
          : mutationErrorResponse(result.error);
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
          return errorResponse("player_not_found");
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
            return errorResponse("already_claimed", {
              explorationId: requestedExplorationId,
              claimedAt: claimed.claimed_at
            });
          }

          return errorResponse("invalid_exploration_state", {
            explorationId: requestedExplorationId,
            actualState:
              exploration === null ? "idle" : "different_exploration",
            allowedStates: ["ready_to_claim"]
          });
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
          ...(runtime.progressionRule
            ? { progressionRule: runtime.progressionRule }
            : {})
        });
        if (!calculated.ok) {
          return mutationErrorResponse(calculated.error);
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
          : mutationErrorResponse(committed.error);
      }

      if (method === "POST" && url.pathname === "/api/equipment") {
        const inventory = await inventoryRepository.findByPlayerId(playerId);
        if (inventory === null) {
          return errorResponse("player_not_found");
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
          return errorResponse("invalid_request");
        }

        const itemInstanceId = body.itemInstanceId as ItemInstanceId;
        if (inventory.equipment.slots[body.slot] === itemInstanceId) {
          return json({ ok: true, inventory, idempotent: true });
        }

        if (inventory.stateVersion !== body.expectedInventoryStateVersion) {
          return errorResponse("version_conflict", {
            snapshot: "inventory",
            expectedVersion: body.expectedInventoryStateVersion,
            actualVersion: inventory.stateVersion
          });
        }

        const equipped = equipItem({
          inventory,
          slot: body.slot,
          itemInstanceId,
          equippedAt: runtime.now()
        });
        if (!equipped.ok) {
          return mutationErrorResponse(equipped.error);
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
          : mutationErrorResponse(committed.error);
      }

      return errorResponse("not_found");
    }
  };
}
