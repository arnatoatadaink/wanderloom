import { describe, expect, it } from "vitest";
import { buildInitialL3BalanceReport } from "./index";

describe("L3 integrated balance report", () => {
  it("builds the full 3 x 3 formation-duration matrix", () => {
    const report = buildInitialL3BalanceReport();
    expect(report.rows).toHaveLength(9);
    expect(report.rows.filter((row) => row.formation.formationClass === "Solo")).toHaveLength(3);
    expect(report.rows.filter((row) => row.formation.formationClass === "Party")).toHaveLength(3);
    expect(report.rows.filter((row) => row.formation.formationClass === "Caravan")).toHaveLength(3);
  });

  it("passes the initial ADR-010 economy acceptance criteria", () => {
    const report = buildInitialL3BalanceReport();
    expect(report.acceptance.totalOutputOrdering).toBe(true);
    expect(report.acceptance.shortSoloCompetitiveness).toBe(true);
    expect(report.acceptance.mediumSoloEfficiency).toBe(true);
    expect(report.acceptance.longSoloEfficiency).toBe(true);
    expect(report.acceptance.groupGrossAdvantageShrinksWithDuration).toBe(true);
  });

  it("passes the Student t rarity opportunity direction", () => {
    const report = buildInitialL3BalanceReport();
    expect(report.acceptance.expectedRarityScoreImprovesWithDuration).toBe(true);
    expect(report.acceptance.epicOrBetterImprovesWithDuration).toBe(true);
    expect(report.acceptance.legendOrBetterImprovesWithDuration).toBe(true);
    expect(report.acceptance.mythicOrBetterImprovesWithDuration).toBe(true);
    expect(report.acceptance.phantasmImprovesWithDuration).toBe(true);
    expect(report.acceptance.passed).toBe(true);
  });

  it("uses the same rarity quality distribution for all formations at the same duration", () => {
    const report = buildInitialL3BalanceReport();
    for (const duration of ["Short", "Medium", "Long"] as const) {
      const rows = report.rows.filter((row) => row.formation.durationClass === duration);
      expect(rows).toHaveLength(3);
      expect(rows[0]!.rarity.probabilityByRarity).toEqual(rows[1]!.rarity.probabilityByRarity);
      expect(rows[1]!.rarity.probabilityByRarity).toEqual(rows[2]!.rarity.probabilityByRarity);
    }
  });

  it("can expose tuning failures instead of hard-coding a pass", () => {
    const report = buildInitialL3BalanceReport({
      rarityDegreesOfFreedom: { Short: 5, Medium: 6, Long: 8 }
    });
    expect(report.acceptance.phantasmImprovesWithDuration).toBe(false);
    expect(report.acceptance.passed).toBe(false);
  });
});
