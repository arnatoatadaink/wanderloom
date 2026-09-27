import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import type { PlayerId } from "@wanderloom/game-core";
import type { ApiDatabase } from "./api";
import { GoogleOAuthClient } from "./google-oauth";
import { D1GoogleDriveAuthorizationRepository } from "./persistence/d1-google-drive-authorization-repository";
import { AesGcmSecretCipher } from "./secret-cipher";
import { getGoogleDriveConnectionStatus } from "./services/get-google-drive-connection-status";
import { syncGoogleDriveArchive } from "./services/sync-google-drive-archive";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

function base64Key(): string {
  const bytes = new Uint8Array(32);
  bytes.fill(9);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const encryptionKey = base64Key();

async function seedAuthorization(playerId: PlayerId): Promise<void> {
  const db = env.DB as unknown as ApiDatabase;
  const now = "2026-09-27T04:00:00.000Z";

  await db
    .prepare(
      `INSERT INTO players (player_id, created_at, updated_at)
       VALUES (?1, ?2, ?2)`
    )
    .bind(playerId, now)
    .run();

  const encrypted = await new AesGcmSecretCipher(encryptionKey)
    .encrypt("refresh-token-cp39");

  await new D1GoogleDriveAuthorizationRepository(db).upsert({
    playerId,
    refreshTokenCiphertext: encrypted.ciphertext,
    refreshTokenIv: encrypted.iv,
    grantedScope: "https://www.googleapis.com/auth/drive.appdata",
    authorizedAt: now
  });
}

function syncEnv() {
  return {
    DB: env.DB as unknown as ApiDatabase,
    GOOGLE_CLIENT_ID: "client-cp39",
    GOOGLE_CLIENT_SECRET: "secret-cp39",
    ARCHIVE_TOKEN_ENCRYPTION_KEY: encryptionKey
  };
}

describe("CP-39 Drive reauthorization classification", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("persists reauthorization_required only for invalid_grant", async () => {
    const playerId = "player-cp39-invalid-grant" as PlayerId;
    await seedAuthorization(playerId);

    const oauthClient = new GoogleOAuthClient(async () =>
      Response.json(
        {
          error: "invalid_grant",
          error_description: "Token has been expired or revoked."
        },
        { status: 400 }
      )
    );

    const response = await syncGoogleDriveArchive({
      playerId,
      env: syncEnv(),
      oauthClient,
      now: () => "2026-09-27T04:05:00.000Z"
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "google_drive_reauthorization_required",
        retryable: false,
        details: { reason: "invalid_grant" }
      }
    });

    await expect(
      getGoogleDriveConnectionStatus({
        playerId,
        repository: new D1GoogleDriveAuthorizationRepository(
          env.DB as unknown as ApiDatabase
        )
      })
    ).resolves.toMatchObject({
      state: "reauthorization_required"
    });
  });

  it("keeps authorization connected for a retryable provider outage", async () => {
    const playerId = "player-cp39-provider-503" as PlayerId;
    await seedAuthorization(playerId);

    const oauthClient = new GoogleOAuthClient(async () =>
      new Response("temporary outage", { status: 503 })
    );

    const response = await syncGoogleDriveArchive({
      playerId,
      env: syncEnv(),
      oauthClient,
      now: () => "2026-09-27T04:06:00.000Z"
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "google_drive_provider_unavailable",
        retryable: true
      }
    });

    await expect(
      getGoogleDriveConnectionStatus({
        playerId,
        repository: new D1GoogleDriveAuthorizationRepository(
          env.DB as unknown as ApiDatabase
        )
      })
    ).resolves.toMatchObject({
      state: "connected"
    });
  });

  it("does not retry OAuth when the stored authorization is already invalid", async () => {
    const playerId = "player-cp39-already-invalid" as PlayerId;
    await seedAuthorization(playerId);

    const repository = new D1GoogleDriveAuthorizationRepository(
      env.DB as unknown as ApiDatabase
    );
    await repository.markReauthorizationRequired({
      playerId,
      reason: "invalid_grant",
      updatedAt: "2026-09-27T04:07:00.000Z"
    });

    let refreshCalls = 0;
    const oauthClient = new GoogleOAuthClient(async () => {
      refreshCalls += 1;
      return Response.json({
        access_token: "should-not-be-used",
        expires_in: 3600
      });
    });

    const response = await syncGoogleDriveArchive({
      playerId,
      env: syncEnv(),
      oauthClient
    });

    expect(response.status).toBe(401);
    expect(refreshCalls).toBe(0);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "google_drive_reauthorization_required",
        retryable: false
      }
    });
  });
});
