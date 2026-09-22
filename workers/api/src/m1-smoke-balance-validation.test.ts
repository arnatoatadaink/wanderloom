import { describe, expect, it } from "vitest";

import {
  resolveSeededM1Exploration,
  type ExplorationId,
  type ZoneId
} from "@wanderloom/game-core";

import { M1_SMOKE_RECENT_ARCHIVE_RETENTION } from "./m1-smoke-rules";

describe("CP-13/15 provisional M1 balance guard", () => {
  it("keeps seeded rewards inside the published preview range", () => {
    for (const seed of ["seed-a", "seed-b", "seed-c", "seed-d"]) {
      const resolution = resolveSeededM1Exploration({
        seed,
        explorationId: "run-1" as ExplorationId,
        zoneId: "m1-smoke-frontier" as ZoneId,
        durationId: "short"
      });

      expect(resolution.gold).toBeGreaterThanOrEqual(5);
      expect(resolution.gold).toBeLessThanOrEqual(6);
      expect(resolution.exp).toBe(10);
      expect(resolution.generatedDrops).toHaveLength(1);
      expect(resolution.generatedDrops[0]?.itemDefinitionId).toBe(
        "m1-wayfarer-charm"
      );
    }

    expect(M1_SMOKE_RECENT_ARCHIVE_RETENTION).toBe(3);
  });
});
