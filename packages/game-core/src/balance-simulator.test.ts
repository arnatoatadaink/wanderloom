import { describe, expect, it } from "vitest";
import {
  simulateBalance,
  type ItemDefinitionId,
  type ZoneId,
  type ZoneRewardConfiguration
} from "./index";

describe("CP-24 balance simulator", () => {
  const zoneId = "sim-zone" as ZoneId;
  const rewardConfiguration: ZoneRewardConfiguration = {
    zoneId,
    durations: [{ durationId: "short", dropCount: 2 }],
    drops: [
      { itemDefinitionId: "common" as ItemDefinitionId, rarity: "Common", weight: 8 },
      { itemDefinitionId: "rare" as ItemDefinitionId, rarity: "Rare", weight: 2 }
    ]
  };
  const input = {
    seedPrefix: "cp24",
    iterations: 100,
    zoneId,
    durationId: "short",
    expeditionConfig: {
      failureProbability: 0.25,
      lossPolicy: { retainedGoldRatio: 0.5, retainedExpRatio: 0.5, retainGeneratedDrops: false }
    },
    rewardConfiguration,
    initialProgression: { level: 1, exp: 0, gold: 0 },
    progressionRule: { maxLevel: 100, expRequiredForLevel: () => 100 }
  } as const;

  it("is exactly reproducible for the same seeded inputs", () => {
    expect(simulateBalance(input)).toEqual(simulateBalance(input));
  });

  it("reports outcome, EV, drop rarity, and progression measurements", () => {
    const report = simulateBalance(input);
    expect(report.successes + report.failures).toBe(100);
    expect(report.successRate).toBe(report.successes / 100);
    expect(report.retainedGoldPerRun).toBe(report.retainedGoldTotal / 100);
    expect(report.retainedExpPerRun).toBe(report.retainedExpTotal / 100);
    expect(report.generatedDropCount).toBe(200);
    expect((report.rarityCounts.Common ?? 0) + (report.rarityCounts.Rare ?? 0)).toBe(200);
    expect(report.finalProgression.gold).toBe(report.retainedGoldTotal);
    expect(report.levelsGained).toBeGreaterThanOrEqual(0);
  });

  it("rejects invalid iteration counts", () => {
    expect(() => simulateBalance({ ...input, iterations: 0 })).toThrow(RangeError);
  });
});
