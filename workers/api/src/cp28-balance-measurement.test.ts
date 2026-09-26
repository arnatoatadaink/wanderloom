import { describe, expect, it } from "vitest";

import {
  simulateBalanceScenarios,
  type BalanceScenarioInput,
  type ZoneId
} from "@wanderloom/game-core";
import {
  M2_PREVIEW_LOSS_POLICY,
  M2_SMOKE_PROGRESSION_RULE,
  M2_SMOKE_REWARD_CONFIGURATIONS,
  M2_SMOKE_ZONES
} from "./m1-smoke-rules";

function currentSmokeScenarios(): readonly BalanceScenarioInput[] {
  return M2_SMOKE_ZONES.flatMap((zone) => {
    const rewardConfiguration = M2_SMOKE_REWARD_CONFIGURATIONS.find(
      (entry) => entry.zoneId === zone.zoneId
    );
    if (!rewardConfiguration) {
      throw new Error(`missing reward configuration for ${zone.zoneId}`);
    }

    return zone.durations.map((duration) => ({
      scenarioId: `${zone.zoneId}/${duration.durationId}`,
      durationMs: duration.durationMs,
      simulation: {
        seedPrefix: `cp28:${zone.zoneId}:${duration.durationId}`,
        iterations: 1_000,
        zoneId: zone.zoneId as ZoneId,
        durationId: duration.durationId,
        expeditionConfig: {
          failureProbability: 0.25,
          lossPolicy: M2_PREVIEW_LOSS_POLICY
        },
        rewardConfiguration,
        initialProgression: { level: 1, exp: 0, gold: 0 },
        progressionRule: M2_SMOKE_PROGRESSION_RULE
      }
    }));
  });
}

describe("CP-28 current M2 smoke balance baseline", () => {
  it("measures all four current zone/duration choices with one scenario format", () => {
    const reports = simulateBalanceScenarios(currentSmokeScenarios());

    expect(reports.map((report) => report.scenarioId)).toEqual([
      "m1-smoke-frontier/short",
      "m1-smoke-frontier/long",
      "m2-moss-hollow/short",
      "m2-moss-hollow/long"
    ]);

    for (const report of reports) {
      expect(report.simulation.iterations).toBe(1_000);
      expect(report.simulation.successes + report.simulation.failures).toBe(1_000);
      expect(report.simulation.successRate).toBeGreaterThan(0);
      expect(report.simulation.successRate).toBeLessThan(1);
      expect(report.retainedGoldPerMinute).toBeGreaterThan(0);
      expect(report.retainedExpPerMinute).toBeGreaterThan(0);
      expect(report.generatedDropsPerMinute).toBeGreaterThan(0);
      expect(report.simulation.retainedDropCount + report.simulation.lostDropCount)
        .toBe(report.simulation.generatedDropCount);
    }
  });

  it("captures the current structural lack of Gold/EXP duration differentiation", () => {
    const reports = simulateBalanceScenarios(currentSmokeScenarios());
    const frontierShort = reports[0]!;
    const frontierLong = reports[1]!;
    const mossShort = reports[2]!;
    const mossLong = reports[3]!;

    expect(frontierShort.simulation.generatedExpTotal).toBe(10_000);
    expect(frontierLong.simulation.generatedExpTotal).toBe(10_000);
    expect(mossShort.simulation.generatedExpTotal).toBe(10_000);
    expect(mossLong.simulation.generatedExpTotal).toBe(10_000);

    // The production resolver currently generates the same 5-6 Gold and 10 EXP
    // per run regardless of duration. Time normalization therefore exposes long
    // runs as roughly half the Gold/EXP rate of short runs.
    expect(frontierLong.retainedExpPerMinute)
      .toBeLessThan(frontierShort.retainedExpPerMinute);
    expect(mossLong.retainedExpPerMinute)
      .toBeLessThan(mossShort.retainedExpPerMinute);

    // Short=1 drop/5m and long=2 drops/10m, so generated drop throughput is
    // intentionally equal in the current smoke configuration.
    expect(frontierLong.generatedDropsPerMinute)
      .toBe(frontierShort.generatedDropsPerMinute);
    expect(mossLong.generatedDropsPerMinute)
      .toBe(mossShort.generatedDropsPerMinute);
  });

  it("keeps rarity reachability distinct between the two provisional zones", () => {
    const reports = simulateBalanceScenarios(currentSmokeScenarios());

    expect(Object.keys(reports[0]!.rarityRates).sort()).toEqual([
      "Common",
      "Rare"
    ]);
    expect(Object.keys(reports[2]!.rarityRates).sort()).toEqual([
      "Epic",
      "Uncommon"
    ]);
  });
});
