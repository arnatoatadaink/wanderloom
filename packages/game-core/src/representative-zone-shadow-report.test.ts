import { describe, expect, it } from "vitest";
import {
  buildRepresentativeZoneConfiguration,
  buildRepresentativeZoneShadowReport,
  ITEM_RARITIES
} from "./index";

describe("representative zone rarity shadow report", () => {
  it("builds Starter, Standard, and Full reachability profiles", () => {
    expect(buildRepresentativeZoneConfiguration("Starter").drops.map((entry) => entry.rarity)).toEqual([
      "Common", "Uncommon", "Rare"
    ]);
    expect(buildRepresentativeZoneConfiguration("Standard").drops.map((entry) => entry.rarity)).toEqual([
      "Common", "Uncommon", "Rare", "Epic", "Legend"
    ]);
    expect(buildRepresentativeZoneConfiguration("Full").drops.map((entry) => entry.rarity)).toEqual(ITEM_RARITIES);
  });

  it("generates nine deterministic profile-duration scenarios", () => {
    const first = buildRepresentativeZoneShadowReport({ iterationsPerScenario: 250, seedPrefix: "stable" });
    const second = buildRepresentativeZoneShadowReport({ iterationsPerScenario: 250, seedPrefix: "stable" });
    expect(first.rows).toHaveLength(9);
    expect(first).toEqual(second);
  });

  it("uses df 8, 6, 5 for Short, Medium, Long", () => {
    const report = buildRepresentativeZoneShadowReport({ iterationsPerScenario: 50 });
    const full = report.rows.filter((row) => row.profile === "Full");
    expect(full.map((row) => [row.durationClass, row.degreesOfFreedom])).toEqual([
      ["Short", 8], ["Medium", 6], ["Long", 5]
    ]);
  });

  it("never lets a candidate emit a rarity outside profile reachability", () => {
    const report = buildRepresentativeZoneShadowReport({ iterationsPerScenario: 500 });
    for (const row of report.rows) {
      const allowed = new Set(row.reachableRarities);
      for (const [rarity, count] of Object.entries(row.report.candidate.rarityCounts)) {
        if (!allowed.has(rarity as never)) expect(count).toBe(0);
      }
    }
  });

  it("rejects invalid iteration counts", () => {
    expect(() => buildRepresentativeZoneShadowReport({ iterationsPerScenario: 0 })).toThrow(RangeError);
  });
});
