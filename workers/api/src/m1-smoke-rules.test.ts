import { describe, expect, it } from "vitest";

import type { ExplorationId, ZoneId } from "@wanderloom/game-core";
import {
  M1_SMOKE_RECENT_ARCHIVE_RETENTION,
  resolveM1SmokeDurationMs,
  resolveM1SmokeExploration
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

  it("rejects unknown zone/duration combinations", () => {
    expect(
      resolveM1SmokeDurationMs("unknown" as ZoneId, "short")
    ).toBeNull();
  });

  it("returns a deterministic no-drop smoke resolution", () => {
    expect(
      resolveM1SmokeExploration("exploration-1" as ExplorationId)
    ).toEqual({
      result: "success",
      gold: 5,
      exp: 10,
      drops: [],
      summaryMetrics: {}
    });
    expect(M1_SMOKE_RECENT_ARCHIVE_RETENTION).toBe(3);
  });
});
