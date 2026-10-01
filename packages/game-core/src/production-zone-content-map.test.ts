import { describe, expect, it } from "vitest";
import {
  INITIAL_PRODUCTION_ZONE_CONTENT_MAP,
  availableProductionZonesForRank,
  getProductionZoneContent,
  validateProductionZoneContentMap,
  type ZoneId
} from "./index";

describe("production zone content map", () => {
  it("defines a monotonic five-zone progression from Tier1 to Tier3", () => {
    expect(() => validateProductionZoneContentMap()).not.toThrow();
    expect(INITIAL_PRODUCTION_ZONE_CONTENT_MAP).toHaveLength(5);
    expect(INITIAL_PRODUCTION_ZONE_CONTENT_MAP.map((zone) => zone.rarityTier)).toEqual([
      "Tier1",
      "Tier1",
      "Tier2",
      "Tier2",
      "Tier3"
    ]);
  });

  it("unlocks zones cumulatively by zone rank", () => {
    expect(availableProductionZonesForRank(0).map((zone) => zone.displayName)).toEqual([
      "Wayfarer Meadow"
    ]);
    expect(availableProductionZonesForRank(2).map((zone) => zone.displayName)).toEqual([
      "Wayfarer Meadow",
      "Mossglass Grove",
      "Shattered Causeway"
    ]);
    expect(availableProductionZonesForRank(4)).toHaveLength(5);
  });

  it("keeps reward, risk, and travel cost non-decreasing across progression", () => {
    const zones = INITIAL_PRODUCTION_ZONE_CONTENT_MAP;
    for (let index = 1; index < zones.length; index += 1) {
      expect(zones[index]!.riskIndex).toBeGreaterThanOrEqual(zones[index - 1]!.riskIndex);
      expect(zones[index]!.baseRewardGold).toBeGreaterThanOrEqual(zones[index - 1]!.baseRewardGold);
      expect(zones[index]!.travelCostGold).toBeGreaterThanOrEqual(zones[index - 1]!.travelCostGold);
    }
  });

  it("retrieves a production zone by stable zone id", () => {
    const zone = getProductionZoneContent("starfall-frontier" as ZoneId);
    expect(zone.displayName).toBe("Starfall Frontier");
    expect(zone.rarityTier).toBe("Tier3");
  });

  it("rejects malformed maps and invalid ranks", () => {
    expect(() => availableProductionZonesForRank(-1)).toThrow(RangeError);
    expect(() =>
      validateProductionZoneContentMap([
        INITIAL_PRODUCTION_ZONE_CONTENT_MAP[0]!,
        { ...INITIAL_PRODUCTION_ZONE_CONTENT_MAP[1]!, minimumZoneRank: 0 }
      ])
    ).toThrow(RangeError);
  });
});
