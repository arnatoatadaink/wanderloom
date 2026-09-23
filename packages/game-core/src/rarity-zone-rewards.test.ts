import { describe, expect, it } from "vitest";
import {
  ITEM_RARITIES,
  generateSeededRarityDrop,
  generateSeededRarityDrops,
  previewConfiguredRarities,
  type ItemDefinitionId,
  type ZoneId,
  type ZoneRewardConfiguration
} from "./index";

const zoneA = "zone-a" as ZoneId;
const config: ZoneRewardConfiguration = {
  zoneId: zoneA,
  durations: [
    { durationId: "short", dropCount: 1 },
    { durationId: "long", dropCount: 2 }
  ],
  drops: ITEM_RARITIES.map((rarity, index) => ({
    itemDefinitionId: `item-${index}` as ItemDefinitionId,
    rarity,
    weight: index + 1
  }))
};

describe("CP-22 rarity + multi-zone reward contract", () => {
  it("exposes all seven rarity labels", () => {
    expect(ITEM_RARITIES).toEqual([
      "Common", "Uncommon", "Rare", "Epic", "Legend", "Mythic", "Phantasm"
    ]);
  });

  it("uses one zone/duration configuration for preview and seeded resolution", () => {
    expect(previewConfiguredRarities(config, "short")).toEqual(ITEM_RARITIES);
    const input = { seed: "repeatable", zoneId: zoneA, durationId: "short", configuration: config };
    expect(generateSeededRarityDrop(input)).toEqual(generateSeededRarityDrop(input));
  });

  it("allows a zone to make upper rarities unreachable by configuration", () => {
    const starter: ZoneRewardConfiguration = {
      zoneId: "starter" as ZoneId,
      durations: [{ durationId: "short", dropCount: 1 }],
      drops: config.drops.slice(0, 3)
    };
    expect(previewConfiguredRarities(starter, "short")).toEqual(["Common", "Uncommon", "Rare"]);
  });

  it("lets duration change drop count and rarity reachability independently", () => {
    const durationConfig: ZoneRewardConfiguration = {
      ...config,
      durations: [
        { durationId: "short", dropCount: 1 },
        {
          durationId: "long",
          dropCount: 3,
          rarityWeightMultipliers: { Mythic: 0, Phantasm: 0 }
        }
      ]
    };
    expect(generateSeededRarityDrops({
      seed: "duration", zoneId: zoneA, durationId: "long", configuration: durationConfig
    })).toHaveLength(3);
    expect(previewConfiguredRarities(durationConfig, "long")).not.toContain("Mythic");
    expect(previewConfiguredRarities(durationConfig, "long")).not.toContain("Phantasm");
  });

  it("rejects mismatched zones and unconfigured durations", () => {
    expect(() => generateSeededRarityDrop({
      seed: "x", zoneId: "other" as ZoneId, durationId: "short", configuration: config
    })).toThrow(RangeError);
    expect(() => previewConfiguredRarities(config, "unknown")).toThrow(RangeError);
  });
});
