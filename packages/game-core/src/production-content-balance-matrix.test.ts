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
    expect(report.allFormationTotalOutputOrdered).toBe(true);
  });

  it("surfaces short-duration solo pressure in higher zones instead of hiding it", () => {
    const report = buildProductionContentBalanceMatrix();
    const shortFailures = report.soloDiagnostics.filter(
      (row) => row.durationClass === "Short" && !row.soloMeetsNinetyPercent
    );

    expect(shortFailures.map((row) => row.zoneName)).toEqual([
      "Shattered Causeway",
      "Ashwind Highlands",
      "Starfall Frontier"
    ]);
    expect(
      report.soloDiagnostics.find(
        (row) => row.zoneName === "Wayfarer Meadow" && row.durationClass === "Short"
      )?.soloMeetsNinetyPercent
    ).toBe(true);
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
