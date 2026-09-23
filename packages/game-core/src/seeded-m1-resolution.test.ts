import { describe, expect, it } from "vitest";

import {
  M1_WAYFARER_CHARM_ITEM_DEFINITION_ID,
  resolveSeededExpedition,
  resolveSeededM1Exploration,
  type ExplorationId,
  type LossPolicy,
  type ZoneId
} from "./index";

const baseInput = {
  explorationId: "exploration-1" as ExplorationId,
  zoneId: "m1-smoke-frontier" as ZoneId,
  durationId: "short"
};

const lossPolicy: LossPolicy = {
  retainedGoldRatio: 0.5,
  retainedExpRatio: 0.5,
  retainGeneratedDrops: false
};

describe("CP-15 seeded M1 resolution", () => {
  it("returns the same result for the same seed", () => {
    const first = resolveSeededM1Exploration({ ...baseInput, seed: "seed-repeatable" });
    const second = resolveSeededM1Exploration({ ...baseInput, seed: "seed-repeatable" });
    expect(second).toEqual(first);
    expect(first.generatedDrops).toEqual([
      { itemDefinitionId: M1_WAYFARER_CHARM_ITEM_DEFINITION_ID }
    ]);
  });

  it("keeps rewards within the M1 preview contract", () => {
    for (const seed of ["seed-a", "seed-b", "seed-c", "seed-d"]) {
      const result = resolveSeededM1Exploration({ ...baseInput, seed });
      expect(result.result).toBe("success");
      expect(result.gold).toBeGreaterThanOrEqual(5);
      expect(result.gold).toBeLessThanOrEqual(6);
      expect(result.exp).toBe(10);
      expect(result.generatedDrops).toHaveLength(1);
    }
  });
});

describe("CP-20 seeded failure resolution", () => {
  it("is fully deterministic for the same inputs, configuration and seed", () => {
    const input = {
      ...baseInput,
      seed: "cp20-repeatable",
      config: { failureProbability: 0.5, lossPolicy }
    };
    expect(resolveSeededExpedition(input)).toEqual(resolveSeededExpedition(input));
  });

  it("can force success without changing the M1 success reward semantics", () => {
    const result = resolveSeededExpedition({
      ...baseInput,
      seed: "cp20-success",
      config: { failureProbability: 0, lossPolicy }
    });
    expect(result.result).toBe("success");
    expect(result.rewards.outcome).toBe("success");
    expect(result.rewards.retainedGold).toBe(result.generatedGold);
    expect(result.rewards.retainedExp).toBe(result.generatedExp);
    expect(result.rewards.retainedDrops).toEqual(result.generatedDrops);
  });

  it("can force failure and applies the configured loss policy", () => {
    const result = resolveSeededExpedition({
      ...baseInput,
      seed: "cp20-failure",
      config: { failureProbability: 1, lossPolicy }
    });
    expect(result.result).toBe("failure");
    expect(result.rewards.outcome).toBe("failure");
    expect(result.rewards.retainedGold).toBe(Math.floor(result.generatedGold * 0.5));
    expect(result.rewards.retainedExp).toBe(5);
    expect(result.rewards.retainedDrops).toEqual([]);
    expect(result.rewards.lostDrops).toEqual(result.generatedDrops);
  });

  it("makes zone and duration part of the deterministic resolution input", () => {
    const config = { failureProbability: 0.5, lossPolicy };
    const baseline = resolveSeededExpedition({ ...baseInput, seed: "dimension-test", config });
    const otherZone = resolveSeededExpedition({
      ...baseInput,
      zoneId: "another-zone" as ZoneId,
      seed: "dimension-test",
      config
    });
    const otherDuration = resolveSeededExpedition({
      ...baseInput,
      durationId: "long",
      seed: "dimension-test",
      config
    });
    expect(otherZone.summaryMetrics.failureRoll).not.toBe(baseline.summaryMetrics.failureRoll);
    expect(otherDuration.summaryMetrics.failureRoll).not.toBe(baseline.summaryMetrics.failureRoll);
  });
});
