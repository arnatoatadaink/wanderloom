import { describe, expect, it } from "vitest";
import {
  INITIAL_DURATION_RARITY_DF,
  resolveSeededRarityDrop,
  resolveSeededRarityDrops,
  type ItemDefinitionId,
  type ZoneId,
  type ZoneRewardConfiguration
} from "./index";

const zoneId = "migration-zone" as ZoneId;
const configuration: ZoneRewardConfiguration = {
  zoneId,
  durations: [
    { durationId: "short", dropCount: 2, rarityWeightMultipliers: { Rare: 2 } },
    { durationId: "long", dropCount: 3 }
  ],
  drops: [
    { itemDefinitionId: "common-a" as ItemDefinitionId, rarity: "Common", weight: 3 },
    { itemDefinitionId: "common-b" as ItemDefinitionId, rarity: "Common", weight: 1 },
    { itemDefinitionId: "rare-a" as ItemDefinitionId, rarity: "Rare", weight: 1 },
    { itemDefinitionId: "epic-a" as ItemDefinitionId, rarity: "Epic", weight: 1 },
    { itemDefinitionId: "legend-a" as ItemDefinitionId, rarity: "Legend", weight: 1 },
    { itemDefinitionId: "mythic-a" as ItemDefinitionId, rarity: "Mythic", weight: 1 },
    { itemDefinitionId: "phantasm-a" as ItemDefinitionId, rarity: "Phantasm", weight: 1 }
  ]
};

describe("rarity resolver migration facade", () => {
  it("preserves legacy behavior when strategy is omitted", () => {
    const input = { seed: "legacy", zoneId, durationId: "short", configuration } as const;
    expect(resolveSeededRarityDrop(input)).toEqual(resolveSeededRarityDrop({
      ...input,
      strategy: { kind: "legacy-weighted" }
    }));
  });

  it("is deterministic under the student-t strategy", () => {
    const input = {
      seed: "student-t",
      zoneId,
      durationId: "long",
      configuration,
      strategy: { kind: "student-t", degreesOfFreedom: INITIAL_DURATION_RARITY_DF.long }
    } as const;
    expect(resolveSeededRarityDrop(input)).toEqual(resolveSeededRarityDrop(input));
    expect(resolveSeededRarityDrops(input)).toEqual(resolveSeededRarityDrops(input));
  });

  it("uses the configured duration drop count in student-t mode", () => {
    const drops = resolveSeededRarityDrops({
      seed: "count",
      zoneId,
      durationId: "long",
      configuration,
      strategy: { kind: "student-t", degreesOfFreedom: INITIAL_DURATION_RARITY_DF.long }
    });
    expect(drops).toHaveLength(3);
  });

  it("never resolves a rarity excluded by reachability", () => {
    for (let index = 0; index < 200; index += 1) {
      const drop = resolveSeededRarityDrop({
        seed: `restricted:${index}`,
        zoneId,
        durationId: "long",
        configuration,
        strategy: {
          kind: "student-t",
          degreesOfFreedom: INITIAL_DURATION_RARITY_DF.long,
          reachableRarities: ["Common", "Rare"]
        }
      });
      expect(["Common", "Rare"]).toContain(drop.rarity);
    }
  });

  it("selects only items belonging to the resolved rarity", () => {
    for (let index = 0; index < 200; index += 1) {
      const drop = resolveSeededRarityDrop({
        seed: `item:${index}`,
        zoneId,
        durationId: "long",
        configuration,
        strategy: { kind: "student-t", degreesOfFreedom: INITIAL_DURATION_RARITY_DF.long }
      });
      const definition = configuration.drops.find((entry) => entry.itemDefinitionId === drop.itemDefinitionId);
      expect(definition?.rarity).toBe(drop.rarity);
    }
  });

  it("rejects student-t reachability with no configured rarity", () => {
    expect(() => resolveSeededRarityDrop({
      seed: "none",
      zoneId,
      durationId: "long",
      configuration,
      strategy: {
        kind: "student-t",
        degreesOfFreedom: INITIAL_DURATION_RARITY_DF.long,
        reachableRarities: ["Uncommon"]
      }
    })).toThrow(RangeError);
  });
});
