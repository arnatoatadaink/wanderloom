import { describe, expect, it } from "vitest";
import {
  INITIAL_PRODUCTION_ZONE_CONTENT_MAP,
  INITIAL_PRODUCTION_ZONE_EXP_REWARD_TABLE,
  getProductionZoneExpReward,
  validateProductionZoneExpRewardTable
} from "./index";

describe("production zone EXP rewards", () => {
  it("defines exactly one EXP row per initial production zone", () => {
    expect(INITIAL_PRODUCTION_ZONE_EXP_REWARD_TABLE).toHaveLength(INITIAL_PRODUCTION_ZONE_CONTENT_MAP.length);
    expect(() => validateProductionZoneExpRewardTable()).not.toThrow();
  });

  it("uses the initial 15-cell Zone x Duration baseline", () => {
    const values = INITIAL_PRODUCTION_ZONE_CONTENT_MAP.map((zone) => [
      getProductionZoneExpReward(zone.zoneId, "Short").generatedExp,
      getProductionZoneExpReward(zone.zoneId, "Medium").generatedExp,
      getProductionZoneExpReward(zone.zoneId, "Long").generatedExp
    ]);

    expect(values).toEqual([
      [8, 28, 80],
      [11, 39, 110],
      [16, 56, 160],
      [22, 77, 220],
      [30, 105, 300]
    ]);
  });

  it("increases absolute EXP with duration for every zone", () => {
    for (const zone of INITIAL_PRODUCTION_ZONE_CONTENT_MAP) {
      const short = getProductionZoneExpReward(zone.zoneId, "Short");
      const medium = getProductionZoneExpReward(zone.zoneId, "Medium");
      const long = getProductionZoneExpReward(zone.zoneId, "Long");
      expect(short.generatedExp).toBeLessThan(medium.generatedExp);
      expect(medium.generatedExp).toBeLessThan(long.generatedExp);
    }
  });

  it("decreases EXP per hour as duration grows", () => {
    for (const zone of INITIAL_PRODUCTION_ZONE_CONTENT_MAP) {
      const short = getProductionZoneExpReward(zone.zoneId, "Short");
      const medium = getProductionZoneExpReward(zone.zoneId, "Medium");
      const long = getProductionZoneExpReward(zone.zoneId, "Long");
      expect(short.expPerHour).toBeGreaterThan(medium.expPerHour);
      expect(medium.expPerHour).toBeGreaterThan(long.expPerHour);
    }
  });

  it("increases EXP reward with zone progression for every duration", () => {
    for (const durationClass of ["Short", "Medium", "Long"] as const) {
      const values = INITIAL_PRODUCTION_ZONE_CONTENT_MAP.map(
        (zone) => getProductionZoneExpReward(zone.zoneId, durationClass).generatedExp
      );
      expect(values).toEqual([...values].sort((a, b) => a - b));
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("rejects malformed tables", () => {
    const first = INITIAL_PRODUCTION_ZONE_EXP_REWARD_TABLE[0]!;
    expect(() => validateProductionZoneExpRewardTable([{ ...first, mediumExp: first.shortExp }])).toThrow(RangeError);
  });
});
