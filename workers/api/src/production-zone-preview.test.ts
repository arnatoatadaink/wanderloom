import { describe, expect, it } from "vitest";

import { buildProductionZonePreview } from "./production-zone-preview";

describe("production zone preview", () => {
  it("returns five production zones with three canonical durations", () => {
    const zones = buildProductionZonePreview(0);
    expect(zones).toHaveLength(5);
    expect(zones.map((zone) => zone.durations.map((duration) => duration.durationId))).toEqual([
      ["short", "medium", "long"],
      ["short", "medium", "long"],
      ["short", "medium", "long"],
      ["short", "medium", "long"],
      ["short", "medium", "long"]
    ]);
  });

  it("marks availability from zone rank", () => {
    const rank0 = buildProductionZonePreview(0);
    expect(rank0.map((zone) => zone.unlocked)).toEqual([
      true,
      false,
      false,
      false,
      false
    ]);

    const rank2 = buildProductionZonePreview(2);
    expect(rank2.map((zone) => zone.unlocked)).toEqual([
      true,
      true,
      true,
      false,
      false
    ]);
  });

  it("uses production risk and loss policy in preview", () => {
    const short = buildProductionZonePreview(0)[0]!.durations[0]!;
    expect(short.risk.failureProbability).toBeCloseTo(0.035);
    expect(short.risk.lossPolicy).toEqual({
      retainedGoldRatio: 0.5,
      retainedExpRatio: 0.5,
      retainGeneratedDrops: false
    });
  });

  it("previews success and failure reward bounds", () => {
    const wayfarerShort = buildProductionZonePreview(0)[0]!.durations[0]!;
    expect(wayfarerShort.preview.gold).toEqual({ min: 5, max: 10 });
    expect(wayfarerShort.preview.exp).toEqual({ min: 4, max: 8 });

    const mossglassShort = buildProductionZonePreview(1)[1]!.durations[0]!;
    expect(mossglassShort.preview.gold).toEqual({ min: 6, max: 13 });
    expect(mossglassShort.preview.exp).toEqual({ min: 5.5, max: 11 });
  });

  it("only exposes reachable rarity candidates", () => {
    const zones = buildProductionZonePreview(4);
    expect(zones[0]!.durations[0]!.rarities).toEqual([
      "Common",
      "Uncommon",
      "Rare"
    ]);
    expect(zones[4]!.durations[2]!.rarities).toEqual([
      "Common",
      "Uncommon",
      "Rare",
      "Epic",
      "Legend",
      "Mythic",
      "Phantasm"
    ]);
  });
});
