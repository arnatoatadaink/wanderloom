import { describe, expect, it } from "vitest";
import {
  compareRarityResolutionStrategies,
  type ItemDefinitionId,
  type ZoneId,
  type ZoneRewardConfiguration
} from "./index";

describe("rarity resolver shadow comparison", () => {
  const zoneId = "shadow-zone" as ZoneId;
  const configuration: ZoneRewardConfiguration = {
    zoneId,
    durations: [{ durationId: "long", dropCount: 1 }],
    drops: [
      { itemDefinitionId: "c" as ItemDefinitionId, rarity: "Common", weight: 55 },
      { itemDefinitionId: "u" as ItemDefinitionId, rarity: "Uncommon", weight: 25 },
      { itemDefinitionId: "r" as ItemDefinitionId, rarity: "Rare", weight: 12 },
      { itemDefinitionId: "e" as ItemDefinitionId, rarity: "Epic", weight: 5 },
      { itemDefinitionId: "l" as ItemDefinitionId, rarity: "Legend", weight: 2 },
      { itemDefinitionId: "m" as ItemDefinitionId, rarity: "Mythic", weight: 0.8 },
      { itemDefinitionId: "p" as ItemDefinitionId, rarity: "Phantasm", weight: 0.2 }
    ]
  };

  const input = {
    seedPrefix: "shadow",
    iterations: 5000,
    zoneId,
    durationId: "long",
    configuration,
    candidateStrategy: { kind: "student-t", degreesOfFreedom: 5 }
  } as const;

  it("is exactly reproducible for the same inputs", () => {
    expect(compareRarityResolutionStrategies(input)).toEqual(compareRarityResolutionStrategies(input));
  });

  it("reports counts, probabilities, agreement, and score delta", () => {
    const report = compareRarityResolutionStrategies(input);
    expect(report.iterations).toBe(5000);
    expect(Object.values(report.legacy.rarityCounts).reduce((a, b) => a + b, 0)).toBe(5000);
    expect(Object.values(report.candidate.rarityCounts).reduce((a, b) => a + b, 0)).toBe(5000);
    expect(report.sameRarityRate).toBeGreaterThanOrEqual(0);
    expect(report.sameRarityRate).toBeLessThanOrEqual(1);
    expect(Number.isFinite(report.expectedRarityScoreDelta)).toBe(true);
  });

  it("reports candidate-minus-legacy probability deltas that sum to approximately zero", () => {
    const report = compareRarityResolutionStrategies(input);
    const totalDelta = Object.values(report.probabilityDeltaCandidateMinusLegacy).reduce((a, b) => a + b, 0);
    expect(Math.abs(totalDelta)).toBeLessThan(1e-12);
  });

  it("reports distribution distance and cumulative upper-tail deltas", () => {
    const report = compareRarityResolutionStrategies(input);
    expect(report.distance.totalVariationDistance).toBeGreaterThanOrEqual(0);
    expect(report.distance.totalVariationDistance).toBeLessThanOrEqual(1);
    expect(report.distance.maxAbsoluteTierDelta).toBeGreaterThanOrEqual(0);
    expect(report.distance.maxAbsoluteTierDelta).toBeLessThanOrEqual(1);
    expect(Number.isFinite(report.distance.tailDeltaCandidateMinusLegacy.rareOrBetter)).toBe(true);
    expect(Number.isFinite(report.distance.tailDeltaCandidateMinusLegacy.epicOrBetter)).toBe(true);
    expect(Number.isFinite(report.distance.tailDeltaCandidateMinusLegacy.legendOrBetter)).toBe(true);
    expect(Number.isFinite(report.distance.tailDeltaCandidateMinusLegacy.mythicOrBetter)).toBe(true);
    expect(Number.isFinite(report.distance.tailDeltaCandidateMinusLegacy.phantasm)).toBe(true);
  });

  it("computes total variation as half the L1 tier-distance", () => {
    const report = compareRarityResolutionStrategies(input);
    const expected =
      0.5 *
      Object.values(report.probabilityDeltaCandidateMinusLegacy)
        .map(Math.abs)
        .reduce((a, b) => a + b, 0);
    expect(report.distance.totalVariationDistance).toBeCloseTo(expected, 15);
    expect(report.distance.maxAbsoluteTierDelta).toBeCloseTo(
      Math.max(...Object.values(report.probabilityDeltaCandidateMinusLegacy).map(Math.abs)),
      15
    );
  });

  it("rejects invalid iteration counts", () => {
    expect(() => compareRarityResolutionStrategies({ ...input, iterations: 0 })).toThrow(RangeError);
  });
});
