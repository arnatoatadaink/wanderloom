import { describe, expect, it } from "vitest";
import {
  INITIAL_PRODUCTION_ZONE_CONTENT_MAP,
  resolveZoneRankProgression
} from "./index";

describe("simple zone rank progression", () => {
  it("advances one rank after succeeding in the current-rank zone", () => {
    const result = resolveZoneRankProgression({
      currentZoneRank: 0,
      completedZoneId: INITIAL_PRODUCTION_ZONE_CONTENT_MAP[0]!.zoneId,
      succeeded: true
    });

    expect(result.rankAdvanced).toBe(true);
    expect(result.nextZoneRank).toBe(1);
    expect(result.nextUnlockedZoneId).toBe(INITIAL_PRODUCTION_ZONE_CONTENT_MAP[1]!.zoneId);
  });

  it("does not advance on failure", () => {
    const result = resolveZoneRankProgression({
      currentZoneRank: 1,
      completedZoneId: INITIAL_PRODUCTION_ZONE_CONTENT_MAP[1]!.zoneId,
      succeeded: false
    });

    expect(result.rankAdvanced).toBe(false);
    expect(result.nextZoneRank).toBe(1);
    expect(result.nextUnlockedZoneId).toBeNull();
  });

  it("does not advance when replaying a lower-rank zone", () => {
    const result = resolveZoneRankProgression({
      currentZoneRank: 2,
      completedZoneId: INITIAL_PRODUCTION_ZONE_CONTENT_MAP[0]!.zoneId,
      succeeded: true
    });

    expect(result.rankAdvanced).toBe(false);
    expect(result.nextZoneRank).toBe(2);
  });

  it("advances exactly one rank even when clearing a later configured zone is requested", () => {
    const result = resolveZoneRankProgression({
      currentZoneRank: 1,
      completedZoneId: INITIAL_PRODUCTION_ZONE_CONTENT_MAP[2]!.zoneId,
      succeeded: true
    });

    expect(result.rankAdvanced).toBe(false);
    expect(result.nextZoneRank).toBe(1);
  });

  it("keeps the final rank capped after success", () => {
    const finalZone = INITIAL_PRODUCTION_ZONE_CONTENT_MAP.at(-1)!;
    const result = resolveZoneRankProgression({
      currentZoneRank: finalZone.minimumZoneRank,
      completedZoneId: finalZone.zoneId,
      succeeded: true
    });

    expect(result.rankAdvanced).toBe(false);
    expect(result.nextZoneRank).toBe(finalZone.minimumZoneRank);
    expect(result.nextUnlockedZoneId).toBeNull();
  });

  it("rejects invalid current ranks and unknown zones", () => {
    expect(() => resolveZoneRankProgression({
      currentZoneRank: -1,
      completedZoneId: INITIAL_PRODUCTION_ZONE_CONTENT_MAP[0]!.zoneId,
      succeeded: true
    })).toThrow(RangeError);
  });
});
