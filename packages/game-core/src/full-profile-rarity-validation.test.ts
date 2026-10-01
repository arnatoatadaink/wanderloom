import { describe, expect, it } from "vitest";
import {
  buildFullProfileRarityValidationReport,
  INITIAL_FULL_PROFILE_VALIDATION_THRESHOLDS
} from "./index";

describe("full profile rarity validation", () => {
  it("is deterministic for the same inputs", () => {
    const input = { iterationsPerDuration: 2_000, seedPrefix: "deterministic-full-profile" } as const;
    expect(buildFullProfileRarityValidationReport(input)).toEqual(
      buildFullProfileRarityValidationReport(input)
    );
  });

  it("evaluates Short, Medium, and Long with the initial df values", () => {
    const report = buildFullProfileRarityValidationReport({ iterationsPerDuration: 2_000 });
    expect(report.rows.map((row) => [row.durationClass, row.degreesOfFreedom])).toEqual([
      ["Short", 8],
      ["Medium", 6],
      ["Long", 5]
    ]);
  });

  it("exposes the initial migration thresholds", () => {
    expect(INITIAL_FULL_PROFILE_VALIDATION_THRESHOLDS).toEqual({
      maxTotalVariationDistance: 0.02,
      maxAbsoluteTierDelta: 0.015,
      maxAbsoluteExpectedRarityScoreDelta: 0.05
    });
  });

  it("can fail deliberately strict acceptance thresholds", () => {
    const report = buildFullProfileRarityValidationReport({
      iterationsPerDuration: 2_000,
      thresholds: {
        maxTotalVariationDistance: 0,
        maxAbsoluteTierDelta: 0,
        maxAbsoluteExpectedRarityScoreDelta: 0
      }
    });
    expect(report.accepted).toBe(false);
    expect(report.rows.some((row) => !row.accepted)).toBe(true);
  });

  it("rejects invalid iteration counts and thresholds", () => {
    expect(() => buildFullProfileRarityValidationReport({ iterationsPerDuration: 0 })).toThrow(RangeError);
    expect(() => buildFullProfileRarityValidationReport({
      iterationsPerDuration: 10,
      thresholds: {
        ...INITIAL_FULL_PROFILE_VALIDATION_THRESHOLDS,
        maxTotalVariationDistance: -1
      }
    })).toThrow(RangeError);
  });
});
