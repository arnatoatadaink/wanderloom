import { describe, expect, it } from "vitest";
import {
  API_ERROR_CODES,
  apiError,
  apiErrorStatus,
  isRetryableApiError
} from "./api-contract";

describe("CP-29 API error contract", () => {
  it("defines a status for every public API error code", () => {
    for (const code of API_ERROR_CODES) {
      expect(apiErrorStatus(code)).toBeGreaterThanOrEqual(400);
      expect(apiErrorStatus(code)).toBeLessThan(600);
    }
  });

  it("marks only reconciliation-safe or provider-transient outcomes retryable", () => {
    expect(isRetryableApiError("version_conflict")).toBe(true);
    expect(isRetryableApiError("already_claimed")).toBe(true);
    expect(isRetryableApiError("google_drive_provider_unavailable")).toBe(true);
    expect(isRetryableApiError("google_drive_reauthorization_required")).toBe(false);
    expect(isRetryableApiError("invalid_request")).toBe(false);
    expect(isRetryableApiError("player_not_found")).toBe(false);
    expect(isRetryableApiError("zone_locked")).toBe(false);
  });

  it("maps a locked production zone to forbidden", () => {
    expect(apiErrorStatus("zone_locked")).toBe(403);
    expect(
      apiError("zone_locked", {
        zoneId: "mossglass-grove",
        currentZoneRank: 0,
        requiredZoneRank: 1
      })
    ).toEqual({
      ok: false,
      error: {
        code: "zone_locked",
        retryable: false,
        details: {
          zoneId: "mossglass-grove",
          currentZoneRank: 0,
          requiredZoneRank: 1
        }
      }
    });
  });

  it("builds a stable envelope with optional details", () => {
    expect(apiError("invalid_request")).toEqual({
      ok: false,
      error: {
        code: "invalid_request",
        retryable: false
      }
    });

    expect(
      apiError("version_conflict", {
        snapshot: "inventory",
        expectedVersion: 2,
        actualVersion: 3
      })
    ).toEqual({
      ok: false,
      error: {
        code: "version_conflict",
        retryable: true,
        details: {
          snapshot: "inventory",
          expectedVersion: 2,
          actualVersion: 3
        }
      }
    });
  });
});
