import { describe, expect, it } from "vitest";

import type { ZoneId } from "@wanderloom/game-core";
import {
  M1_SMOKE_RECENT_ARCHIVE_RETENTION,
  M1_SMOKE_ZONES,
  resolveM1SmokeDurationMs
} from "./m1-smoke-rules";

describe("M1 smoke rules", () => {
  it("resolves the provisional short duration", () => {
    expect(
      resolveM1SmokeDurationMs(
        "m1-smoke-frontier" as ZoneId,
        "short"
      )
    ).toBe(300_000);
  });

  it("exposes the provisional reward preview", () => {
    expect(M1_SMOKE_ZONES[0]?.durations[0]?.preview).toEqual({
      gold: { min: 5, max: 6 },
      exp: { min: 10, max: 10 },
      drops: { minItems: 1, maxItems: 1 }
    });
  });

  it("rejects unknown zone/duration combinations", () => {
    expect(
      resolveM1SmokeDurationMs("unknown" as ZoneId, "short")
    ).toBeNull();
  });

});
