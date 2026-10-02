import { describe, expect, it } from "vitest";
import {
  INITIAL_PRODUCTION_LOSS_POLICY,
  calculateProductionLossPolicyExpectation
} from "./index";

describe("production loss policy calibration", () => {
  it("uses a symmetric 50/50 Gold and EXP retention candidate", () => {
    expect(INITIAL_PRODUCTION_LOSS_POLICY).toEqual({
      retainedGoldRatio: 0.5,
      retainedExpRatio: 0.5,
      retainGeneratedDrops: false
    });
  });

  it("keeps success-weighted Gold and EXP retention symmetric", () => {
    const metrics = calculateProductionLossPolicyExpectation({
      failureProbability: 0.125,
      generatedGold: 100,
      generatedExp: 100
    });

    expect(metrics.expectedGoldRetentionRatio).toBeCloseTo(0.9375);
    expect(metrics.expectedExpRetentionRatio).toBeCloseTo(0.9375);
    expect(metrics.expectedGoldBeforeFixedCost).toBeCloseTo(93.75);
    expect(metrics.expectedExp).toBeCloseTo(93.75);
  });

  it("charges fixed Gold costs regardless of success or failure", () => {
    const metrics = calculateProductionLossPolicyExpectation({
      failureProbability: 0.1,
      generatedGold: 100,
      generatedExp: 0,
      fixedGoldCost: 12
    });

    expect(metrics.expectedGoldBeforeFixedCost).toBeCloseTo(95);
    expect(metrics.expectedGoldAfterFixedCost).toBeCloseTo(83);
  });

  it("loses generated drops only on failure in the initial candidate", () => {
    const metrics = calculateProductionLossPolicyExpectation({
      failureProbability: 0.125,
      generatedGold: 0,
      generatedExp: 0,
      generatedDropCount: 8
    });

    expect(metrics.expectedDropRetentionRatio).toBeCloseTo(0.875);
    expect(metrics.expectedRetainedDropCount).toBeCloseTo(7);
  });

  it("supports alternate severity without changing failure frequency", () => {
    const metrics = calculateProductionLossPolicyExpectation({
      failureProbability: 0.1,
      generatedGold: 100,
      generatedExp: 100,
      lossPolicy: {
        retainedGoldRatio: 0.25,
        retainedExpRatio: 0.75,
        retainGeneratedDrops: true
      }
    });

    expect(metrics.failureProbability).toBe(0.1);
    expect(metrics.expectedGoldRetentionRatio).toBeCloseTo(0.925);
    expect(metrics.expectedExpRetentionRatio).toBeCloseTo(0.975);
    expect(metrics.expectedDropRetentionRatio).toBe(1);
  });

  it("rejects invalid probabilities and negative generated values", () => {
    expect(() =>
      calculateProductionLossPolicyExpectation({
        failureProbability: 1.1,
        generatedGold: 0,
        generatedExp: 0
      })
    ).toThrow(RangeError);
    expect(() =>
      calculateProductionLossPolicyExpectation({
        failureProbability: 0.1,
        generatedGold: -1,
        generatedExp: 0
      })
    ).toThrow(RangeError);
  });
});
