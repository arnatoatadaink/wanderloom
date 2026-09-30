import { describe, expect, it } from "vitest";
import {
  calculateFormationEconomy,
  calculateParameterizedOperationalCost
} from "./index";

describe("L3 formation economy model", () => {
  it("matches the initial Solo Party Caravan cost and reward matrix", () => {
    const soloLong = calculateFormationEconomy({
      formationClass: "Solo",
      participantCount: 1,
      durationClass: "Long"
    });
    const partyLong = calculateFormationEconomy({
      formationClass: "Party",
      participantCount: 2,
      durationClass: "Long"
    });
    const caravanLong = calculateFormationEconomy({
      formationClass: "Caravan",
      participantCount: 5,
      durationClass: "Long"
    });

    expect(soloLong.baseOperationalCost).toBe(0);
    expect(soloLong.netReward).toBe(120);
    expect(partyLong.baseOperationalCost).toBe(8);
    expect(partyLong.netReward).toBe(172);
    expect(caravanLong.baseOperationalCost).toBe(32);
    expect(caravanLong.netReward).toBe(228);
  });

  it("keeps Caravan cost flat between 5 and 12 participants in the initial model", () => {
    const five = calculateFormationEconomy({
      formationClass: "Caravan",
      participantCount: 5,
      durationClass: "Medium"
    });
    const twelve = calculateFormationEconomy({
      formationClass: "Caravan",
      participantCount: 12,
      durationClass: "Medium"
    });

    expect(five.baseOperationalCost).toBe(12);
    expect(twelve.baseOperationalCost).toBe(12);
    expect(five.grossReward).toBe(twelve.grossReward);
  });

  it("applies reduction only to operational cost and keeps travel/content additive", () => {
    const report = calculateFormationEconomy({
      formationClass: "Party",
      participantCount: 2,
      durationClass: "Long",
      operationalCostReduction: 0.25,
      travelCost: 3,
      explicitContentCost: 2
    });

    expect(report.baseOperationalCost).toBe(8);
    expect(report.effectiveOperationalCost).toBe(6);
    expect(report.finalGoldRequirement).toBe(11);
    expect(report.netReward).toBe(169);
  });

  it("preserves the initial Solo competitiveness shape", () => {
    const soloShort = calculateFormationEconomy({ formationClass: "Solo", participantCount: 1, durationClass: "Short" });
    const partyShort = calculateFormationEconomy({ formationClass: "Party", participantCount: 2, durationClass: "Short" });
    const soloMedium = calculateFormationEconomy({ formationClass: "Solo", participantCount: 1, durationClass: "Medium" });
    const partyMedium = calculateFormationEconomy({ formationClass: "Party", participantCount: 2, durationClass: "Medium" });
    const soloLong = calculateFormationEconomy({ formationClass: "Solo", participantCount: 1, durationClass: "Long" });
    const partyLong = calculateFormationEconomy({ formationClass: "Party", participantCount: 2, durationClass: "Long" });

    expect(soloShort.netRewardPerParticipant / partyShort.netRewardPerParticipant).toBeGreaterThanOrEqual(0.9);
    expect(soloMedium.netRewardPerParticipant).toBeGreaterThanOrEqual(partyMedium.netRewardPerParticipant);
    expect(soloLong.netRewardPerParticipant).toBeGreaterThan(partyLong.netRewardPerParticipant);
  });

  it("exposes a future formula seam for additional cost parameters", () => {
    expect(
      calculateParameterizedOperationalCost({
        formationClass: "Caravan",
        participantCount: 12,
        durationClass: "Long",
        baseFormationCost: 4,
        durationMultiplier: 8,
        coordinationCost: 4,
        logisticsCost: 8,
        travelCost: 3,
        otherCost: 1,
        costReduction: 0.5
      })
    ).toBe(26);
  });

  it("rejects invalid initial formation sizes", () => {
    expect(() =>
      calculateFormationEconomy({ formationClass: "Party", participantCount: 5, durationClass: "Short" })
    ).toThrow(RangeError);
  });
});
