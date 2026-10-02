import { describe, expect, it } from "vitest";
import {
  INITIAL_PRODUCTION_MAX_LEVEL,
  INITIAL_PRODUCTION_PROGRESSION_RULE,
  applyProgressionExp,
  buildInitialProductionProgressionCurve,
  estimateRunsToNextLevel,
  initialProductionExpRequiredForLevel
} from "./index";

describe("production progression curve", () => {
  it("uses a quadratic 30 * level^2 requirement through level 9", () => {
    expect(INITIAL_PRODUCTION_MAX_LEVEL).toBe(10);
    expect(initialProductionExpRequiredForLevel(1)).toBe(30);
    expect(initialProductionExpRequiredForLevel(2)).toBe(120);
    expect(initialProductionExpRequiredForLevel(3)).toBe(270);
    expect(initialProductionExpRequiredForLevel(9)).toBe(2430);
  });

  it("builds the cumulative curve to the initial cap", () => {
    const curve = buildInitialProductionProgressionCurve();
    expect(curve).toHaveLength(9);
    expect(curve[0]).toEqual({
      level: 1,
      nextLevel: 2,
      expRequired: 30,
      cumulativeExpFromLevelOne: 30
    });
    expect(curve.at(-1)).toEqual({
      level: 9,
      nextLevel: 10,
      expRequired: 2430,
      cumulativeExpFromLevelOne: 8550
    });
  });

  it("keeps one Starfall Long success from skipping more than two levels from level one", () => {
    expect(
      applyProgressionExp(
        { level: 1, exp: 0, gold: 0 },
        300,
        INITIAL_PRODUCTION_PROGRESSION_RULE
      ).next
    ).toEqual({ level: 3, exp: 150, gold: 0 });
  });

  it("keeps one Starfall Long failure-retained reward at two gained levels", () => {
    expect(
      applyProgressionExp(
        { level: 1, exp: 0, gold: 0 },
        150,
        INITIAL_PRODUCTION_PROGRESSION_RULE
      ).next
    ).toEqual({ level: 3, exp: 0, gold: 0 });
  });

  it("estimates about four starter short runs for the first level-up", () => {
    expect(estimateRunsToNextLevel({ level: 1, expectedExpPerRun: 7.86 })).toBeCloseTo(3.8168, 4);
  });

  it("rejects invalid levels and expected EXP inputs", () => {
    expect(() => initialProductionExpRequiredForLevel(0)).toThrow(RangeError);
    expect(() => initialProductionExpRequiredForLevel(10)).toThrow(RangeError);
    expect(() => estimateRunsToNextLevel({ level: 1, expectedExpPerRun: 0 })).toThrow(RangeError);
  });
});
