import { describe, expect, it } from "vitest";
import {
  INITIAL_PRODUCTION_ZONE_CONTENT_MAP,
  buildProductionContentBalanceMatrix
} from "./index";

describe("production content balance matrix", () => {
  it("builds 5 zones x 3 durations x 3 formations", () => {
    const report = buildProductionContentBalanceMatrix();
    expect(report.rows).toHaveLength(45);
    expect(report.soloDiagnostics).toHaveLength(15);
  });

  it("keeps total formation output ordered and all initial net rewards non-negative", () => {
    const report = buildProductionContentBalanceMatrix();
    expect(report.allNetRewardsNonNegative).toBe(true);
    expect(report.allExpectedNetGoldNonNegative).toBe(true);
    expect(report.allFormationTotalOutputOrdered).toBe(true);
  });

  it("restores the short-duration Solo ninety-percent floor across all initial zones", () => {
    const report = buildProductionContentBalanceMatrix();
    const shortDiagnostics = report.soloDiagnostics.filter(
      (row) => row.durationClass === "Short"
    );

    expect(shortDiagnostics).toHaveLength(5);
    expect(shortDiagnostics.every((row) => row.soloMeetsNinetyPercent)).toBe(true);
    expect(Math.min(...shortDiagnostics.map((row) => row.soloRelativeToBestGroup))).toBeGreaterThanOrEqual(0.9);
  });

  it("keeps Solo zone-risk overhead neutral while increasing group overhead", () => {
    const report = buildProductionContentBalanceMatrix();
    const rows = report.rows.filter(
      (row) => row.zone.displayName === "Starfall Frontier" && row.durationClass === "Short"
    );

    const solo = rows.find((row) => row.formationClass === "Solo")!;
    const party = rows.find((row) => row.formationClass === "Party")!;
    const caravan = rows.find((row) => row.formationClass === "Caravan")!;

    expect(solo.zoneRiskOperationalCostMultiplier).toBe(1);
    expect(party.zoneRiskOperationalCostMultiplier).toBeGreaterThan(1);
    expect(caravan.zoneRiskOperationalCostMultiplier).toBeGreaterThan(party.zoneRiskOperationalCostMultiplier);
  });

  it("keeps failure probability formation-independent within a zone and duration", () => {
    const report = buildProductionContentBalanceMatrix();
    const rows = report.rows.filter(
      (row) => row.zone.displayName === "Starfall Frontier" && row.durationClass === "Long"
    );

    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((row) => row.riskFailure.failureProbability)).size).toBe(1);
    expect(rows[0]!.riskFailure.failureProbability).toBeCloseTo(0.125);
  });

  it("increases failure probability with duration for the same zone", () => {
    const report = buildProductionContentBalanceMatrix();
    const soloRows = report.rows.filter(
      (row) => row.zone.displayName === "Ashwind Highlands" && row.formationClass === "Solo"
    );
    const short = soloRows.find((row) => row.durationClass === "Short")!;
    const medium = soloRows.find((row) => row.durationClass === "Medium")!;
    const long = soloRows.find((row) => row.durationClass === "Long")!;

    expect(short.riskFailure.failureProbability).toBeLessThan(medium.riskFailure.failureProbability);
    expect(medium.riskFailure.failureProbability).toBeLessThan(long.riskFailure.failureProbability);
  });

  it("applies the symmetric production loss policy to expected Gold and EXP retention", () => {
    const report = buildProductionContentBalanceMatrix();
    const row = report.rows.find(
      (candidate) =>
        candidate.zone.displayName === "Starfall Frontier" &&
        candidate.durationClass === "Long" &&
        candidate.formationClass === "Solo"
    )!;

    expect(row.riskFailure.failureProbability).toBeCloseTo(0.125);
    expect(row.lossExpectation.expectedGoldRetentionRatio).toBeCloseTo(0.9375);
    expect(row.lossExpectation.expectedExpRetentionRatio).toBeCloseTo(0.9375);
    expect(row.lossExpectation.expectedDropRetentionRatio).toBeCloseTo(0.875);
    expect(row.lossExpectation.expectedNetGold).toBeLessThan(row.economy.netReward);
  });

  it("keeps loss-retention ratios formation-independent within a zone and duration", () => {
    const report = buildProductionContentBalanceMatrix();
    const rows = report.rows.filter(
      (row) => row.zone.displayName === "Starfall Frontier" && row.durationClass === "Long"
    );

    expect(new Set(rows.map((row) => row.lossExpectation.expectedGoldRetentionRatio)).size).toBe(1);
    expect(new Set(rows.map((row) => row.lossExpectation.expectedExpRetentionRatio)).size).toBe(1);
    expect(new Set(rows.map((row) => row.lossExpectation.expectedDropRetentionRatio)).size).toBe(1);
  });

  it("keeps rarity opportunity formation-independent within a zone and duration", () => {
    const report = buildProductionContentBalanceMatrix();
    const rows = report.rows.filter(
      (row) => row.zone.displayName === "Starfall Frontier" && row.durationClass === "Long"
    );

    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((row) => row.rarity.phantasmProbability)).size).toBe(1);
    expect(rows[0]!.rarity.phantasmProbability).toBeGreaterThan(0);
  });

  it("honors zone rarity reachability at every formation", () => {
    const report = buildProductionContentBalanceMatrix();
    const tier1Zone = INITIAL_PRODUCTION_ZONE_CONTENT_MAP[0]!;
    const tier1Rows = report.rows.filter((row) => row.zone.zoneId === tier1Zone.zoneId);

    for (const row of tier1Rows) {
      expect(row.rarity.probabilityByRarity.Epic).toBe(0);
      expect(row.rarity.probabilityByRarity.Legend).toBe(0);
      expect(row.rarity.probabilityByRarity.Mythic).toBe(0);
      expect(row.rarity.probabilityByRarity.Phantasm).toBe(0);
    }
  });
});
