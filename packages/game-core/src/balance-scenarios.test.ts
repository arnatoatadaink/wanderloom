import { describe, expect, it } from "vitest";
import {
  simulateBalanceScenario,
  simulateBalanceScenarios,
  type ItemDefinitionId,
  type ZoneId,
  type ZoneRewardConfiguration
} from "./index";

describe("CP-28 balance scenario measurements", () => {
  const zoneId = "scenario-zone" as ZoneId;
  const rewardConfiguration: ZoneRewardConfiguration = {
    zoneId,
    durations: [{ durationId: "short", dropCount: 1 }],
    drops: [
      {
        itemDefinitionId: "common" as ItemDefinitionId,
        rarity: "Common",
        weight: 3
      },
      {
        itemDefinitionId: "rare" as ItemDefinitionId,
        rarity: "Rare",
        weight: 1
      }
    ]
  };

  const scenario = {
    scenarioId: "scenario-zone/short",
    durationMs: 300_000,
    simulation: {
      seedPrefix: "cp28",
      iterations: 200,
      zoneId,
      durationId: "short",
      expeditionConfig: {
        failureProbability: 0.25,
        lossPolicy: {
          retainedGoldRatio: 0.5,
          retainedExpRatio: 0.5,
          retainGeneratedDrops: false
        }
      },
      rewardConfiguration,
      initialProgression: { level: 1, exp: 0, gold: 0 },
      progressionRule: {
        maxLevel: 100,
        expRequiredForLevel: () => 100
      }
    }
  } as const;

  it("adds time-normalized and rarity-rate measurements", () => {
    const report = simulateBalanceScenario(scenario);

    expect(report.scenarioId).toBe("scenario-zone/short");
    expect(report.retainedGoldPerMinute).toBeCloseTo(
      report.simulation.retainedGoldPerRun / 5
    );
    expect(report.retainedExpPerMinute).toBeCloseTo(
      report.simulation.retainedExpPerRun / 5
    );
    expect(report.generatedDropsPerMinute).toBeCloseTo(0.2);
    expect(report.retainedDropsPerMinute).toBeCloseTo(
      (report.simulation.retainedDropCount / report.simulation.iterations) / 5
    );

    const rarityRateTotal = Object.values(report.rarityRates).reduce(
      (sum, rate) => sum + (rate ?? 0),
      0
    );
    expect(rarityRateTotal).toBeCloseTo(1);
  });

  it("is reproducible and preserves scenario order", () => {
    const inputs = [
      scenario,
      {
        ...scenario,
        scenarioId: "scenario-zone/short-alt",
        simulation: {
          ...scenario.simulation,
          seedPrefix: "cp28-alt"
        }
      }
    ];

    expect(simulateBalanceScenarios(inputs)).toEqual(
      simulateBalanceScenarios(inputs)
    );
    expect(simulateBalanceScenarios(inputs).map((report) => report.scenarioId))
      .toEqual(["scenario-zone/short", "scenario-zone/short-alt"]);
  });

  it("rejects invalid scenario metadata", () => {
    expect(() =>
      simulateBalanceScenario({ ...scenario, scenarioId: "" })
    ).toThrow(RangeError);
    expect(() =>
      simulateBalanceScenario({ ...scenario, durationMs: 0 })
    ).toThrow(RangeError);
    expect(() =>
      simulateBalanceScenarios([scenario, scenario])
    ).toThrow(RangeError);
  });
});
