import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import type { PlayerId } from "@wanderloom/game-core";
import worker from "./index";
import type { ApiDatabase } from "./api";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

const disconnectedPlayerId = "player-cp36-disconnected" as PlayerId;
const connectedPlayerId = "player-cp36-connected" as PlayerId;

function statusRequest(playerId?: PlayerId): Request {
  const init: RequestInit = { method: "GET" };
  if (playerId !== undefined) {
    init.headers = { "x-wanderloom-player-id": playerId };
  }

  return new Request(
    "https://wanderloom.test/api/archive/google/status",
    init
  );
}

describe("CP-36 Google Drive connection status API", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    const db = env.DB as unknown as ApiDatabase;
    const createdAt = "2026-09-27T01:00:00.000Z";

    for (const playerId of [disconnectedPlayerId, connectedPlayerId]) {
      await db
        .prepare(
          `INSERT INTO players (player_id, created_at, updated_at)
           VALUES (?1, ?2, ?2)`
        )
        .bind(playerId, createdAt)
        .run();
    }

    await db
      .prepare(
        `INSERT INTO google_drive_authorizations (
           player_id,
           refresh_token_ciphertext,
           refresh_token_iv,
           granted_scope,
           authorized_at,
           updated_at
         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(
        connectedPlayerId,
        "ciphertext-secret-must-not-leak",
        "iv-secret-must-not-leak",
        "openid https://www.googleapis.com/auth/drive.appdata",
        "2026-09-27T01:01:00.000Z",
        "2026-09-27T01:02:00.000Z"
      )
      .run();
  });

  it("returns not_connected when no Drive authorization exists", async () => {
    const response = await worker.fetch(statusRequest(disconnectedPlayerId), env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      connection: {
        state: "not_connected",
        grantedScope: null,
        authorizedAt: null,
        updatedAt: null
      }
    });
  });

  it("returns safe connected metadata without exposing credential material", async () => {
    const response = await worker.fetch(statusRequest(connectedPlayerId), env);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      ok: true,
      connection: {
        state: "connected",
        grantedScope: "openid https://www.googleapis.com/auth/drive.appdata",
        authorizedAt: "2026-09-27T01:01:00.000Z",
        updatedAt: "2026-09-27T01:02:00.000Z"
      }
    });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("ciphertext-secret-must-not-leak");
    expect(serialized).not.toContain("iv-secret-must-not-leak");
    expect(serialized).not.toContain("refreshToken");
    expect(serialized).not.toContain("accessToken");
  });

  it("uses the stable missing_player_id error contract", async () => {
    const response = await worker.fetch(statusRequest(), env);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "missing_player_id",
        retryable: false
      }
    });
  });
});
