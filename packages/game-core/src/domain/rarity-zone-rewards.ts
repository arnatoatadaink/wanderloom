import type { ItemDefinitionId, ZoneId } from "./ids";
import type { GeneratedDrop } from "./reward-drop-contract";

export const ITEM_RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legend",
  "Mythic",
  "Phantasm"
] as const;

export type ItemRarity = (typeof ITEM_RARITIES)[number];

export interface RarityDropEntry {
  readonly itemDefinitionId: ItemDefinitionId;
  readonly rarity: ItemRarity;
  readonly weight: number;
}

export interface DurationRewardModifier {
  readonly durationId: string;
  readonly dropWeightMultiplier: number;
}

export interface ZoneRewardConfiguration {
  readonly zoneId: ZoneId;
  readonly drops: readonly RarityDropEntry[];
  readonly durations: readonly DurationRewardModifier[];
}

export interface RarityGeneratedDrop extends GeneratedDrop {
  readonly rarity: ItemRarity;
}

function hashText(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function requireDuration(
  configuration: ZoneRewardConfiguration,
  durationId: string
): DurationRewardModifier {
  const duration = configuration.durations.find((entry) => entry.durationId === durationId);
  if (!duration) throw new RangeError("durationId is not configured for zone");
  if (!Number.isFinite(duration.dropWeightMultiplier) || duration.dropWeightMultiplier <= 0) {
    throw new RangeError("dropWeightMultiplier must be a positive finite number");
  }
  return duration;
}

function weightedDrops(configuration: ZoneRewardConfiguration, multiplier: number) {
  if (configuration.drops.length === 0) {
    throw new RangeError("zone must configure at least one drop");
  }
  return configuration.drops.map((entry) => {
    if (!Number.isFinite(entry.weight) || entry.weight <= 0) {
      throw new RangeError("drop weight must be a positive finite number");
    }
    return { entry, weight: entry.weight * multiplier };
  });
}

export function generateSeededRarityDrop(input: {
  readonly seed: string;
  readonly zoneId: ZoneId;
  readonly durationId: string;
  readonly configuration: ZoneRewardConfiguration;
}): RarityGeneratedDrop {
  if (input.zoneId !== input.configuration.zoneId) {
    throw new RangeError("zoneId does not match reward configuration");
  }

  const duration = requireDuration(input.configuration, input.durationId);
  const weighted = weightedDrops(input.configuration, duration.dropWeightMultiplier);
  const totalWeight = weighted.reduce((sum, candidate) => sum + candidate.weight, 0);
  const roll = (hashText([input.seed, input.zoneId, input.durationId].join("|")) / 0x100000000) * totalWeight;

  let cursor = 0;
  for (const candidate of weighted) {
    cursor += candidate.weight;
    if (roll < cursor) {
      return {
        itemDefinitionId: candidate.entry.itemDefinitionId,
        rarity: candidate.entry.rarity
      };
    }
  }

  const fallback = weighted[weighted.length - 1]!.entry;
  return { itemDefinitionId: fallback.itemDefinitionId, rarity: fallback.rarity };
}

export function previewConfiguredRarities(
  configuration: ZoneRewardConfiguration,
  durationId: string
): readonly ItemRarity[] {
  const duration = requireDuration(configuration, durationId);
  return weightedDrops(configuration, duration.dropWeightMultiplier)
    .map(({ entry }) => entry.rarity)
    .filter((rarity, index, all) => all.indexOf(rarity) === index);
}
