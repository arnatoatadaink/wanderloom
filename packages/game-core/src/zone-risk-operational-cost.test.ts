import { describe, expect, it } from "vitest";
import {
  INITIAL_ZONE_RISK_OPERATIONAL_COST_PARAMETERS,
  calculateZoneRiskOperationalCostMultiplier
} from "./domain/zone-risk-operational-cost";

describe("zone risk operational cost", () => {
  it("keeps Solo overhead multiplier at one", () => {
    expect(calculateZoneRiskOperationalCostMultiplier({
      formationClass: "Solo",
      riskIndex: 0.42,
      zoneRewardScale: 4
    })).toBe(1);
  });

  it("raises Party overhead with risk and zone scale", () => {
    expect(calculateZoneRiskOperationalCostMultiplier({
      formationClass: "Party",
      riskIndex: 0.42,
      zoneRewardScale: 4
    })).toBeCloseTo(5.368, 12);
  });

  it("makes Caravan more sensitive than Party", () => {
    const input = { riskIndex: 0.32, zoneRewardScale: 2.8 } as const;
    const party = calculateZoneRiskOperationalCostMultiplier({ formationClass: "Party", ...input });
    const caravan = calculateZoneRiskOperationalCostMultiplier({ formationClass: "Caravan", ...input });
    expect(caravan).toBeGreaterThan(party);
  });

  it("supports tunable parameters", () => {
    expect(calculateZoneRiskOperationalCostMultiplier({
      formationClass: "Party",
      riskIndex: 0.5,
      zoneRewardScale: 2,
      parameters: { formationSensitivity: { Solo: 0, Party: 1, Caravan: 2 } }
    })).toBe(2);
  });

  it("rejects invalid risk", () => {
    expect(() => calculateZoneRiskOperationalCostMultiplier({
      formationClass: "Party",
      riskIndex: 1.1,
      zoneRewardScale: 1
    })).toThrow(RangeError);
  });

  it("exposes the accepted initial sensitivities", () => {
    expect(INITIAL_ZONE_RISK_OPERATIONAL_COST_PARAMETERS.formationSensitivity).toEqual({
      Solo: 0,
      Party: 2.6,
      Caravan: 3.2
    });
  });
});
