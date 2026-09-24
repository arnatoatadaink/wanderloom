export interface VerifiedGoogleIdentity {
  readonly subject: string;
}

export interface GoogleIdTokenVerifier {
  verify(
    credential: string,
    expectedAudience: string
  ): Promise<VerifiedGoogleIdentity>;
}

type FetchLike = typeof fetch;

interface GoogleOpenIdConfiguration {
  readonly issuer: string;
  readonly jwks_uri: string;
}

interface GoogleJwk {
  readonly kty: string;
  readonly kid: string;
  readonly use?: string;
  readonly alg?: string;
  readonly n: string;
  readonly e: string;
}

interface GoogleJwks {
  readonly keys: readonly GoogleJwk[];
}

interface JwtHeader {
  readonly alg?: string;
  readonly kid?: string;
}

interface JwtPayload {
  readonly iss?: string;
  readonly aud?: string | readonly string[];
  readonly sub?: string;
  readonly exp?: number;
  readonly nbf?: number;
}

const GOOGLE_DISCOVERY_URL =
  "https://accounts.google.com/.well-known/openid-configuration";
const GOOGLE_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com"
]);

function base64UrlBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonPart<T>(value: string): T {
  const bytes = base64UrlBytes(value);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function audienceMatches(
  audience: string | readonly string[] | undefined,
  expectedAudience: string
): boolean {
  return typeof audience === "string"
    ? audience === expectedAudience
    : Array.isArray(audience) && audience.includes(expectedAudience);
}

export class GoogleOidcVerificationError extends Error {
  constructor(readonly code: "invalid_google_credential") {
    super(code);
  }
}

export class GoogleJwksIdTokenVerifier implements GoogleIdTokenVerifier {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly nowEpochSeconds: () => number = () =>
      Math.floor(Date.now() / 1000)
  ) {}

  async verify(
    credential: string,
    expectedAudience: string
  ): Promise<VerifiedGoogleIdentity> {
    const parts = credential.split(".");
    if (parts.length !== 3) {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }

    const [headerPart, payloadPart, signaturePart] = parts;
    if (!headerPart || !payloadPart || !signaturePart) {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }

    const header = decodeJsonPart<JwtHeader>(headerPart);
    const payload = decodeJsonPart<JwtPayload>(payloadPart);

    if (
      header.alg !== "RS256" ||
      !header.kid ||
      !payload.iss ||
      !GOOGLE_ISSUERS.has(payload.iss) ||
      !audienceMatches(payload.aud, expectedAudience) ||
      !payload.sub ||
      !Number.isFinite(payload.exp)
    ) {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }

    const now = this.nowEpochSeconds();
    if ((payload.exp as number) <= now) {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }
    if (payload.nbf !== undefined && payload.nbf > now) {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }

    const discoveryResponse = await this.fetchImpl(GOOGLE_DISCOVERY_URL);
    if (!discoveryResponse.ok) {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }
    const discovery =
      (await discoveryResponse.json()) as GoogleOpenIdConfiguration;
    if (
      !GOOGLE_ISSUERS.has(discovery.issuer) ||
      !discovery.jwks_uri.startsWith("https://")
    ) {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }

    const jwksResponse = await this.fetchImpl(discovery.jwks_uri);
    if (!jwksResponse.ok) {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }
    const jwks = (await jwksResponse.json()) as GoogleJwks;
    const jwk = jwks.keys.find(
      (entry) =>
        entry.kid === header.kid &&
        entry.kty === "RSA" &&
        (entry.alg === undefined || entry.alg === "RS256")
    );
    if (!jwk) {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlBytes(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`)
    );

    if (!verified) {
      throw new GoogleOidcVerificationError("invalid_google_credential");
    }

    return { subject: payload.sub };
  }
}
