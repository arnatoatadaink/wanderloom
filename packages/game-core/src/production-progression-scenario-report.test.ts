import { describe, expect, it } from "vitest";
import { buildProductionProgressionScenarioReport } from "./index";

describe("production progression scenario report", () => {
  it("builds all 5 zones x 3 durations", () => {
    expect(buildProductionProgressionScenarioReport().rows).toHaveLength(15);
  });

  it("puts the starter short first level-up near four expected runs", () => {
    const report = buildProductionProgressionScenarioReport();
    expect(report.starterShortExpectedRunsToLevelTwo).toBeGreaterThan(3.5);
    expect(report.starterShortExpectedRunsToLevelTwo).toBeLessThan(4.1);
  });

  it("caps one-run success jumps from level one at two levels", () => {
    const report = buildProductionProgressionScenarioReport();
    expect(report.maximumSuccessLevelsGainedFromLevelOne).toBe(2);
    expect(report.maximumFailureLevelsGainedFromLevelOne).toBe(2);
  });

  it("reports Starfall Long expected progression after failure weighting", () => {
    const row = buildProductionProgressionScenarioReport().rows.find(
      (candidate) => candidate.zoneName === "Starfall Frontier" && candidate.durationClass === "Long"
    )!;

    expect(row.generatedExp).toBe(300);
    expect(row.expectedExp).toBeCloseTo(281.25);
    expect(row.expectedExpPerHour).toBeCloseTo(35.15625);
    expect(row.successLevelsGainedFromLevelOne).toBe(2);
    expect(row.failureLevelsGainedFromLevelOne).toBe(2);
  });

  it("keeps expected EXP/hour decreasing with duration for the starter zone", () => {
    const rows = buildProductionProgressionScenarioReport().rows.filter(
      (row) => row.zoneName === "Wayfarer Meadow"
    );
    const short = rows.find((row) => row.durationClass === "Short")!;
    const medium = rows.find((row) => row.durationClass === "Medium")!;
    const long = rows.find((row) => row.durationClass === "Long")!;

    expect(short.expectedExpPerHour).toBeGreaterThan(medium.expectedExpPerHour);
    expect(medium.expectedExpPerHour).toBeGreaterThan(long.expectedExpPerHour);
  });
});
