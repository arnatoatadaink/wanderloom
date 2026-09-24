import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import type {
  ExplorationId,
  ItemInstanceId,
  PlayerId
} from "@wanderloom/game-core";
import {
  createApi,
  type ApiDatabase,
  type ApiRuntime
} from "./api";
import {
  GoogleOidcVerificationError,
  type GoogleIdTokenVerifier
} from "./google-oidc";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

class FakeGoogleVerifier implements GoogleIdTokenVerifier {
  async verify(
    credential: string,
    expectedAudience: string
  ): Promise<{ readonly subject: string }> {
    expect(expectedAudience).toBe("google-client-test");
    if (credential === "bad-token") {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }
    return {
      subject: `google-sub:${credential}`
    };
  }
}

let playerSequence = 0;

const runtime: ApiRuntime = {
  now: () => "2026-09-24T15:00:00.000Z",
  createPlayerId: () => {
    playerSequence += 1;
    return `player-cp31-${playerSequence}` as PlayerId;
  },
  createExplorationId: () => "unused-exploration" as ExplorationId,
  createClaimNonce: () => "unused-nonce",
  createSeed: () => "unused-seed",
  createItemInstanceId: () => "unused-item" as ItemInstanceId,
  resolveDurationMs: () => null,
  resolveExploration: () => null,
  recentArchiveRetention: 3,
  googleIdTokenVerifier: new FakeGoogleVerifier()
};

function request(
  playerId: PlayerId,
  credential: string
): Request {
  return new Request("https://example.test/api/auth/google/link", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-wanderloom-player-id": playerId
    },
    body: JSON.stringify({ credential })
  });
}

async function bootstrap(api: ReturnType<typeof createApi>): Promise<PlayerId> {
  const response = await api.fetch(
    new Request("https://example.test/api/guest/bootstrap", {
      method: "POST"
    }),
    {
      DB: env.DB as unknown as ApiDatabase,
      GOOGLE_CLIENT_ID: "google-client-test"
    }
  );
  expect(response.status).toBe(201);
  const body = (await response.json()) as {
    readonly playerId: PlayerId;
  };
  return body.playerId;
}

describe("CP-31 Google OIDC account linking with real D1", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("links a verified Google subject to the existing guest player and persists it", async () => {
    const api = createApi(runtime);
    const playerId = await bootstrap(api);

    const response = await api.fetch(
      request(playerId, "link-persist"),
      {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      accountLink: {
        status: "linked",
        provider: "google",
        subject: "google-sub:link-persist"
      }
    });

    const row = await env.DB
      .prepare(
        `SELECT provider, subject, player_id
         FROM external_identity_links
         WHERE provider = ?1
           AND subject = ?2`
      )
      .bind("google", "google-sub:link-one")
      .first<{
        provider: string;
        subject: string;
        player_id: string;
      }>();

    expect(row).toEqual({
      provider: "google",
      subject: "google-sub:link-persist",
      player_id: playerId
    });
  });

  it("treats the same Google link as idempotent", async () => {
    const api = createApi(runtime);
    const playerId = await bootstrap(api);

    const first = await api.fetch(
      request(playerId, "link-idempotent"),
      {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }
    );
    expect(first.status).toBe(200);

    const retry = await api.fetch(
      request(playerId, "link-idempotent"),
      {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }
    );

    expect(retry.status).toBe(200);
    await expect(retry.json()).resolves.toEqual({
      ok: true,
      accountLink: {
        status: "already_linked",
        provider: "google",
        subject: "google-sub:link-idempotent"
      }
    });
  });

  it("rejects linking an identity already owned by another player", async () => {
    const api = createApi(runtime);
    const firstPlayer = await bootstrap(api);
    const secondPlayer = await bootstrap(api);

    const first = await api.fetch(
      request(firstPlayer, "link-conflict"),
      {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }
    );
    expect(first.status).toBe(200);

    const conflict = await api.fetch(
      request(secondPlayer, "link-conflict"),
      {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }
    );

    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "external_identity_conflict",
        retryable: false,
        details: {
          provider: "google",
          subject: "google-sub:link-idempotent",
          existingPlayerId: firstPlayer
        }
      }
    });
  });

  it("rejects a second Google subject on the same player", async () => {
    const api = createApi(runtime);
    const playerId = await bootstrap(api);

    const first = await api.fetch(
      request(playerId, "link-provider-one"),
      {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }
    );
    expect(first.status).toBe(200);

    const conflict = await api.fetch(
      request(playerId, "link-provider-two"),
      {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }
    );

    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: "provider_link_conflict",
        retryable: false,
        details: {
          provider: "google",
          existingSubject: "google-sub:link-one"
        }
      }
    });
  });

  it("restores the linked player from a Google credential without a guest header", async () => {
    const api = createApi(runtime);
    const playerId = await bootstrap(api);

    const linked = await api.fetch(
      request(playerId, "link-restore"),
      {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }
    );
    expect(linked.status).toBe(200);

    const restored = await api.fetch(
      new Request("https://example.test/api/auth/google/restore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ credential: "link-restore" })
      }),
      {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }
    );

    expect(restored.status).toBe(200);
    await expect(restored.json()).resolves.toMatchObject({
      ok: true,
      playerId,
      core: {
        playerId
      },
      inventory: {
        playerId
      }
    });
  });

  it("rejects invalid Google credentials", async () => {
    const api = createApi(runtime);
    const playerId = await bootstrap(api);

    const response = await api.fetch(
      request(playerId, "bad-token"),
      {
        DB: env.DB as unknown as ApiDatabase,
        GOOGLE_CLIENT_ID: "google-client-test"
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "invalid_google_credential",
        retryable: false
      }
    });
  });
});
