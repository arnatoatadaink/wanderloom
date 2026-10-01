import { describe, expect, it } from "vitest";
import {
  buildProductionZoneRarityStrategy,
  getProductionZoneRarityCalibration,
  INITIAL_PRODUCTION_ZONE_RARITY_CALIBRATIONS
} from "./index";

describe("production zone rarity calibration", () => {
  it("defines monotonic reachability from Tier1 through Tier3", () => {
    expect(INITIAL_PRODUCTION_ZONE_RARITY_CALIBRATIONS.Tier1.reachableRarities).toEqual([
      "Common",
      "Uncommon",
      "Rare"
    ]);
    expect(INITIAL_PRODUCTION_ZONE_RARITY_CALIBRATIONS.Tier2.reachableRarities).toEqual([
      "Common",
      "Uncommon",
      "Rare",
      "Epic",
      "Legend"
    ]);
    expect(INITIAL_PRODUCTION_ZONE_RARITY_CALIBRATIONS.Tier3.reachableRarities).toEqual([
      "Common",
      "Uncommon",
      "Rare",
      "Epic",
      "Legend",
      "Mythic",
      "Phantasm"
    ]);
  });

  it("uses the accepted df 8 / 6 / 5 duration baseline", () => {
    expect(buildProductionZoneRarityStrategy("Tier3", "Short").degreesOfFreedom).toBe(8);
    expect(buildProductionZoneRarityStrategy("Tier3", "Medium").degreesOfFreedom).toBe(6);
    expect(buildProductionZoneRarityStrategy("Tier3", "Long").degreesOfFreedom).toBe(5);
  });

  it("keeps zone tier reachability independent from duration", () => {
    const short = buildProductionZoneRarityStrategy("Tier2", "Short");
    const long = buildProductionZoneRarityStrategy("Tier2", "Long");
    expect(short.reachableRarities).toEqual(long.reachableRarities);
    expect(short.thresholds).toEqual(long.thresholds);
  });

  it("exposes the exact calibration object for each tier", () => {
    expect(getProductionZoneRarityCalibration("Tier1")).toBe(
      INITIAL_PRODUCTION_ZONE_RARITY_CALIBRATIONS.Tier1
    );
    expect(getProductionZoneRarityCalibration("Tier3")).toBe(
      INITIAL_PRODUCTION_ZONE_RARITY_CALIBRATIONS.Tier3
    );
  });
});
