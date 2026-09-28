import { describe, expect, it } from "vitest";
import {
  classifyOperationalLogLevel,
  createOperationalLogRecord,
  isForbiddenOperationalLogKey,
  sanitizeOperationalLogDetails
} from "./operational-logging-policy";

describe("operational logging policy", () => {
  it("classifies unexpected failures as error and retryable/configuration failures as warn", () => {
    expect(classifyOperationalLogLevel({ unexpected: true })).toBe("error");
    expect(classifyOperationalLogLevel({ retryable: true })).toBe("warn");
    expect(classifyOperationalLogLevel({ configurationMissing: true })).toBe("warn");
    expect(classifyOperationalLogLevel({ retryable: false })).toBe("info");
  });

  it("rejects keys that could expose credentials, secrets, tokens, or encrypted token material", () => {
    for (const key of [
      "authorization",
      "cookie",
      "credential",
      "clientSecret",
      "refreshToken",
      "access_token",
      "idToken",
      "password",
      "refreshTokenCiphertext"
    ]) {
      expect(isForbiddenOperationalLogKey(key)).toBe(true);
    }

    expect(isForbiddenOperationalLogKey("migrationName")).toBe(false);
    expect(isForbiddenOperationalLogKey("statusCode")).toBe(false);
  });

  it("sanitizes forbidden detail fields while preserving safe operational context", () => {
    expect(
      sanitizeOperationalLogDetails({
        status: 503,
        migrationName: "0006_google_drive_authorization.sql",
        accessToken: "never-log-this",
        clientSecret: "never-log-this-either"
      })
    ).toEqual({
      status: 503,
      migrationName: "0006_google_drive_authorization.sql"
    });
  });

  it("creates a structured record without leaking forbidden detail fields", () => {
    expect(
      createOperationalLogRecord(
        "provider_degraded",
        {
          requestId: "req-123",
          environment: "staging",
          route: "/api/archive/sync",
          method: "POST",
          playerId: "smoke-player",
          errorCode: "invalid_google_drive_authorization",
          provider: "google_drive",
          retryable: true,
          details: {
            status: 503,
            refreshToken: "never-log-this"
          }
        }
      )
    ).toEqual({
      level: "warn",
      event: "provider_degraded",
      requestId: "req-123",
      environment: "staging",
      route: "/api/archive/sync",
      method: "POST",
      playerId: "smoke-player",
      errorCode: "invalid_google_drive_authorization",
      provider: "google_drive",
      retryable: true,
      details: { status: 503 }
    });
  });
});
