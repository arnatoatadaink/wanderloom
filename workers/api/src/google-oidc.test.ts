import { describe, expect, it, vi } from "vitest";
import {
  GoogleJwksIdTokenVerifier,
  GoogleOidcVerificationError
} from "./google-oidc";

function base64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function jsonPart(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function createFixture(options: {
  audience?: string;
  subject?: string;
  expiresAt?: number;
} = {}) {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["sign", "verify"]
  );
  const jwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const headerPart = jsonPart({
    alg: "RS256",
    kid: "test-key",
    typ: "JWT"
  });
  const payloadPart = jsonPart({
    iss: "https://accounts.google.com",
    aud: options.audience ?? "client-test",
    sub: options.subject ?? "google-subject",
    exp: options.expiresAt ?? 2_000_000_000
  });
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    new TextEncoder().encode(signingInput)
  );

  const token = `${signingInput}.${base64Url(new Uint8Array(signature))}`;
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes(".well-known/openid-configuration")) {
      return Response.json({
        issuer: "https://accounts.google.com",
        jwks_uri: "https://example.test/google-jwks"
      });
    }
    if (url === "https://example.test/google-jwks") {
      return Response.json({
        keys: [
          {
            ...jwk,
            kid: "test-key",
            alg: "RS256",
            use: "sig"
          }
        ]
      });
    }
    return new Response(null, { status: 404 });
  };

  return { token, fetchImpl };
}

describe("CP-31 Google JWKS ID token verifier", () => {
  it("calls the default Worker fetch with the global receiver", async () => {
    const fixture = await createFixture();
    vi.stubGlobal("fetch", async function (
      this: unknown,
      input: RequestInfo | URL,
      init?: RequestInit
    ) {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      return fixture.fetchImpl(input, init);
    });

    try {
      const verifier = new GoogleJwksIdTokenVerifier(
        undefined,
        () => 1_900_000_000
      );
      await expect(verifier.verify(fixture.token, "client-test")).resolves.toEqual({
        subject: "google-subject"
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("verifies signature, issuer, audience, expiry, and returns only sub", async () => {
    const fixture = await createFixture();
    const verifier = new GoogleJwksIdTokenVerifier(
      fixture.fetchImpl,
      () => 1_900_000_000
    );

    await expect(
      verifier.verify(fixture.token, "client-test")
    ).resolves.toEqual({
      subject: "google-subject"
    });
  });

  it("rejects the wrong audience", async () => {
    const fixture = await createFixture({ audience: "other-client" });
    const verifier = new GoogleJwksIdTokenVerifier(
      fixture.fetchImpl,
      () => 1_900_000_000
    );

    await expect(
      verifier.verify(fixture.token, "client-test")
    ).rejects.toBeInstanceOf(GoogleOidcVerificationError);
  });

  it("rejects an expired ID token", async () => {
    const fixture = await createFixture({ expiresAt: 1_800_000_000 });
    const verifier = new GoogleJwksIdTokenVerifier(
      fixture.fetchImpl,
      () => 1_900_000_000
    );

    await expect(
      verifier.verify(fixture.token, "client-test")
    ).rejects.toBeInstanceOf(GoogleOidcVerificationError);
  });
});
