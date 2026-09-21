import { describe, expect, it } from "vitest";

import type { ExplorationId } from "@wanderloom/game-core";

import {
  M1_SMOKE_RECENT_ARCHIVE_RETENTION,
  resolveM1SmokeExploration
} from "./m1-smoke-rules";

describe("CP-13 provisional M1 smoke balance validation", () => {
  it("keeps the validation fixture deterministic and linear", () => {
    const single = resolveM1SmokeExploration("run-1" as ExplorationId);
    const runs = 12;

    const projected = {
      gold: single.gold * runs,
      exp: single.exp * runs,
      drops: single.drops.length * runs
    };

    expect(single).toMatchObject({
      result: "success",
      gold: 5,
      exp: 10,
      drops: []
    });
    expect(projected).toEqual({
      gold: 60,
      exp: 120,
      drops: 0
    });
    expect(M1_SMOKE_RECENT_ARCHIVE_RETENTION).toBe(3);
  });
});
