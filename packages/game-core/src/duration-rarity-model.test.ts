import { describe, expect, it } from "vitest";
import {
  buildDurationRarityDistribution,
  calculateRarityOpportunityMetrics,
  INITIAL_DURATION_RARITY_DF,
  INITIAL_MEDIUM_T_THRESHOLDS,
  studentTCdf
} from "./index";

describe("L3 duration rarity Student t model", () => {
  it("calibrates the Medium reference distribution", () => {
    const distribution = buildDurationRarityDistribution({
      degreesOfFreedom: INITIAL_DURATION_RARITY_DF.medium,
      thresholds: INITIAL_MEDIUM_T_THRESHOLDS
    });

    expect(distribution.Common).toBeCloseTo(0.55, 6);
    expect(distribution.Uncommon).toBeCloseTo(0.25, 6);
    expect(distribution.Rare).toBeCloseTo(0.12, 6);
    expect(distribution.Epic).toBeCloseTo(0.05, 6);
    expect(distribution.Legend).toBeCloseTo(0.02, 6);
    expect(distribution.Mythic).toBeCloseTo(0.008, 6);
    expect(distribution.Phantasm).toBeCloseTo(0.002, 6);
  });

  it("keeps lower tiers stable while increasing the upper tail for Long", () => {
    const shortDistribution = buildDurationRarityDistribution({
      degreesOfFreedom: INITIAL_DURATION_RARITY_DF.short,
      thresholds: INITIAL_MEDIUM_T_THRESHOLDS
    });
    const mediumDistribution = buildDurationRarityDistribution({
      degreesOfFreedom: INITIAL_DURATION_RARITY_DF.medium,
      thresholds: INITIAL_MEDIUM_T_THRESHOLDS
    });
    const longDistribution = buildDurationRarityDistribution({
      degreesOfFreedom: INITIAL_DURATION_RARITY_DF.long,
      thresholds: INITIAL_MEDIUM_T_THRESHOLDS
    });

    const shortMetrics = calculateRarityOpportunityMetrics(shortDistribution);
    const mediumMetrics = calculateRarityOpportunityMetrics(mediumDistribution);
    const longMetrics = calculateRarityOpportunityMetrics(longDistribution);

    expect(Math.abs(longDistribution.Common - mediumDistribution.Common)).toBeLessThan(0.002);
    expect(longMetrics.legendOrBetterProbability).toBeGreaterThan(mediumMetrics.legendOrBetterProbability);
    expect(mediumMetrics.legendOrBetterProbability).toBeGreaterThan(shortMetrics.legendOrBetterProbability);
    expect(longMetrics.phantasmProbability).toBeGreaterThan(mediumMetrics.phantasmProbability);
    expect(mediumMetrics.phantasmProbability).toBeGreaterThan(shortMetrics.phantasmProbability);
    expect(longMetrics.expectedRarityScore).toBeGreaterThan(mediumMetrics.expectedRarityScore);
    expect(mediumMetrics.expectedRarityScore).toBeGreaterThan(shortMetrics.expectedRarityScore);
  });

  it("respects zone reachability and renormalizes remaining tiers", () => {
    const distribution = buildDurationRarityDistribution({
      degreesOfFreedom: INITIAL_DURATION_RARITY_DF.long,
      thresholds: INITIAL_MEDIUM_T_THRESHOLDS,
      reachableRarities: ["Common", "Uncommon", "Rare", "Epic"]
    });

    expect(distribution.Legend).toBe(0);
    expect(distribution.Mythic).toBe(0);
    expect(distribution.Phantasm).toBe(0);
    expect(Object.values(distribution).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
  });

  it("provides a symmetric Student t CDF", () => {
    const positive = studentTCdf(1.25, 6);
    const negative = studentTCdf(-1.25, 6);
    expect(positive + negative).toBeCloseTo(1, 12);
    expect(studentTCdf(0, 6)).toBe(0.5);
  });

  it("rejects invalid parameters", () => {
    expect(() => studentTCdf(0, 0)).toThrow(RangeError);
    expect(() =>
      buildDurationRarityDistribution({
        degreesOfFreedom: 6,
        thresholds: { ...INITIAL_MEDIUM_T_THRESHOLDS, Rare: INITIAL_MEDIUM_T_THRESHOLDS.Uncommon }
      })
    ).toThrow(RangeError);
  });
});
