import { describe, expect, it } from "vitest";

import type { ZoneId } from "@wanderloom/game-core";
import {
  M1_SMOKE_RECENT_ARCHIVE_RETENTION,
  M1_SMOKE_ZONES,
  resolveM1SmokeDurationMs,
  resolveM2SmokeDurationMs
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

describe("runtime duration compatibility", () => {
  it("keeps M2 smoke durations unchanged", () => {
    expect(
      resolveM2SmokeDurationMs("m1-smoke-frontier" as ZoneId, "short")
    ).toBe(300_000);
    expect(
      resolveM2SmokeDurationMs("m1-smoke-frontier" as ZoneId, "long")
    ).toBe(600_000);
  });

  it("resolves production short, medium, and long durations", () => {
    const zoneId = "wayfarer-meadow" as ZoneId;

    expect(resolveM2SmokeDurationMs(zoneId, "short")).toBe(30 * 60 * 1000);
    expect(resolveM2SmokeDurationMs(zoneId, "medium")).toBe(2 * 60 * 60 * 1000);
    expect(resolveM2SmokeDurationMs(zoneId, "long")).toBe(8 * 60 * 60 * 1000);
  });

  it("rejects unknown production duration IDs", () => {
    expect(
      resolveM2SmokeDurationMs("wayfarer-meadow" as ZoneId, "overnight")
    ).toBeNull();
  });
});
