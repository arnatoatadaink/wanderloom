import { describe, expect, it } from "vitest";

import {
  M1_WAYFARER_CHARM_ITEM_DEFINITION_ID,
  resolveSeededM1Exploration,
  type ExplorationId,
  type ZoneId
} from "./index";

const baseInput = {
  explorationId: "exploration-1" as ExplorationId,
  zoneId: "m1-smoke-frontier" as ZoneId,
  durationId: "short"
};

describe("CP-15 seeded M1 resolution", () => {
  it("returns the same result for the same seed", () => {
    const first = resolveSeededM1Exploration({
      ...baseInput,
      seed: "seed-repeatable"
    });
    const second = resolveSeededM1Exploration({
      ...baseInput,
      seed: "seed-repeatable"
    });

    expect(second).toEqual(first);
    expect(first.generatedDrops).toEqual([
      {
        itemDefinitionId: M1_WAYFARER_CHARM_ITEM_DEFINITION_ID
      }
    ]);
  });

  it("keeps rewards within the M1 preview contract", () => {
    for (const seed of ["seed-a", "seed-b", "seed-c", "seed-d"]) {
      const result = resolveSeededM1Exploration({
        ...baseInput,
        seed
      });

      expect(result.result).toBe("success");
      expect(result.gold).toBeGreaterThanOrEqual(5);
      expect(result.gold).toBeLessThanOrEqual(6);
      expect(result.exp).toBe(10);
      expect(result.generatedDrops).toHaveLength(1);
    }
  });
});
