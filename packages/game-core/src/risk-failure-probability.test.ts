import { describe, expect, it } from "vitest";
import {
  INITIAL_RISK_FAILURE_PROBABILITY_PARAMETERS,
  calculateRiskFailureProbability
} from "./index";

describe("risk failure probability", () => {
  it("maps the initial zone risk range to modest failure probabilities", () => {
    expect(calculateRiskFailureProbability({ riskIndex: 0.10, durationClass: "Short" }).failureProbability).toBeCloseTo(0.035);
    expect(calculateRiskFailureProbability({ riskIndex: 0.42, durationClass: "Medium" }).failureProbability).toBeCloseTo(0.104);
    expect(calculateRiskFailureProbability({ riskIndex: 0.42, durationClass: "Long" }).failureProbability).toBeCloseTo(0.125);
  });

  it("increases exposure monotonically with duration for the same zone risk", () => {
    const short = calculateRiskFailureProbability({ riskIndex: 0.32, durationClass: "Short" });
    const medium = calculateRiskFailureProbability({ riskIndex: 0.32, durationClass: "Medium" });
    const long = calculateRiskFailureProbability({ riskIndex: 0.32, durationClass: "Long" });
    expect(short.failureProbability).toBeLessThan(medium.failureProbability);
    expect(medium.failureProbability).toBeLessThan(long.failureProbability);
  });

  it("increases monotonically with zone risk for the same duration", () => {
    const low = calculateRiskFailureProbability({ riskIndex: 0.10, durationClass: "Medium" });
    const high = calculateRiskFailureProbability({ riskIndex: 0.42, durationClass: "Medium" });
    expect(low.failureProbability).toBeLessThan(high.failureProbability);
  });

  it("caps extreme calibration inputs at the configured maximum", () => {
    const result = calculateRiskFailureProbability({
      riskIndex: 1,
      durationClass: "Long",
      parameters: {
        ...INITIAL_RISK_FAILURE_PROBABILITY_PARAMETERS,
        riskWeight: 1
      }
    });
    expect(result.failureProbability).toBe(0.15);
  });

  it("keeps failure probability independent from formation class", () => {
    const input = { riskIndex: 0.24, durationClass: "Medium" as const };
    expect(calculateRiskFailureProbability(input).failureProbability).toBeCloseTo(0.068);
  });

  it("rejects invalid risk and parameter ranges", () => {
    expect(() => calculateRiskFailureProbability({ riskIndex: -0.1, durationClass: "Short" })).toThrow(RangeError);
    expect(() => calculateRiskFailureProbability({
      riskIndex: 0.2,
      durationClass: "Short",
      parameters: {
        ...INITIAL_RISK_FAILURE_PROBABILITY_PARAMETERS,
        maxFailureProbability: 0.01
      }
    })).toThrow(RangeError);
  });
});
