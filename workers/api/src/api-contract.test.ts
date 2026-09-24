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

  it("marks only reconciliation-safe conflict outcomes retryable", () => {
    expect(isRetryableApiError("version_conflict")).toBe(true);
    expect(isRetryableApiError("already_claimed")).toBe(true);
    expect(isRetryableApiError("invalid_request")).toBe(false);
    expect(isRetryableApiError("player_not_found")).toBe(false);
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
