import type { ZoneId } from "./ids";
import {
  buildDurationRarityDistribution,
  INITIAL_MEDIUM_T_THRESHOLDS,
  type DurationRarityThresholds
} from "./duration-rarity-model";
import {
  generateSeededRarityDrop,
  generateSeededRarityDrops,
  ITEM_RARITIES,
  type ItemRarity,
  type RarityGeneratedDrop,
  type ZoneRewardConfiguration
} from "./rarity-zone-rewards";

export type RarityResolutionStrategy =
  | { readonly kind: "legacy-weighted" }
  | {
      readonly kind: "student-t";
      readonly degreesOfFreedom: number;
      readonly thresholds?: DurationRarityThresholds;
      readonly reachableRarities?: readonly ItemRarity[];
    };

export interface StrategyRarityDropInput {
  readonly seed: string;
  readonly zoneId: ZoneId;
  readonly durationId: string;
  readonly configuration: ZoneRewardConfiguration;
  readonly strategy?: RarityResolutionStrategy;
}

function hashText(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function unitRoll(seed: string): number {
  return hashText(seed) / 0x100000000;
}

function requireDuration(configuration: ZoneRewardConfiguration, durationId: string) {
  const duration = configuration.durations.find((entry) => entry.durationId === durationId);
  if (!duration) throw new RangeError("durationId is not configured for zone");
  if (!Number.isSafeInteger(duration.dropCount) || duration.dropCount < 0) {
    throw new RangeError("dropCount must be a non-negative safe integer");
  }
  return duration;
}

function configuredRarities(configuration: ZoneRewardConfiguration): readonly ItemRarity[] {
  const found = new Set<ItemRarity>();
  for (const entry of configuration.drops) {
    if (!Number.isFinite(entry.weight) || entry.weight <= 0) {
      throw new RangeError("drop weight must be a positive finite number");
    }
    found.add(entry.rarity);
  }
  return ITEM_RARITIES.filter((rarity) => found.has(rarity));
}

function effectiveReachability(
  configuration: ZoneRewardConfiguration,
  requested?: readonly ItemRarity[]
): readonly ItemRarity[] {
  const configured = new Set(configuredRarities(configuration));
  if (!requested) return ITEM_RARITIES.filter((rarity) => configured.has(rarity));
  const requestedSet = new Set(requested);
  return ITEM_RARITIES.filter((rarity) => configured.has(rarity) && requestedSet.has(rarity));
}

function chooseRarity(
  input: StrategyRarityDropInput,
  strategy: Extract<RarityResolutionStrategy, { kind: "student-t" }>
): ItemRarity {
  const reachableRarities = effectiveReachability(input.configuration, strategy.reachableRarities);
  if (reachableRarities.length === 0) throw new RangeError("at least one configured rarity must be reachable");

  const distribution = buildDurationRarityDistribution({
    degreesOfFreedom: strategy.degreesOfFreedom,
    thresholds: strategy.thresholds ?? INITIAL_MEDIUM_T_THRESHOLDS,
    reachableRarities
  });
  const roll = unitRoll([input.seed, input.zoneId, input.durationId, "rarity"].join("|"));
  let cursor = 0;
  for (const rarity of ITEM_RARITIES) {
    cursor += distribution[rarity];
    if (roll < cursor) return rarity;
  }
  return reachableRarities[reachableRarities.length - 1]!;
}

function chooseItemWithinRarity(
  input: StrategyRarityDropInput,
  rarity: ItemRarity
): RarityGeneratedDrop {
  const candidates = input.configuration.drops.filter((entry) => entry.rarity === rarity);
  if (candidates.length === 0) throw new RangeError("selected rarity has no configured drop entries");
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  const roll = unitRoll([input.seed, input.zoneId, input.durationId, rarity, "item"].join("|")) * totalWeight;
  let cursor = 0;
  for (const candidate of candidates) {
    cursor += candidate.weight;
    if (roll < cursor) {
      return { itemDefinitionId: candidate.itemDefinitionId, rarity: candidate.rarity };
    }
  }
  const fallback = candidates[candidates.length - 1]!;
  return { itemDefinitionId: fallback.itemDefinitionId, rarity: fallback.rarity };
}

export function resolveSeededRarityDrop(input: StrategyRarityDropInput): RarityGeneratedDrop {
  if (input.zoneId !== input.configuration.zoneId) {
    throw new RangeError("zoneId does not match reward configuration");
  }
  const strategy = input.strategy ?? { kind: "legacy-weighted" as const };
  if (strategy.kind === "legacy-weighted") {
    return generateSeededRarityDrop(input);
  }
  return chooseItemWithinRarity(input, chooseRarity(input, strategy));
}

export function resolveSeededRarityDrops(input: StrategyRarityDropInput): readonly RarityGeneratedDrop[] {
  const strategy = input.strategy ?? { kind: "legacy-weighted" as const };
  if (strategy.kind === "legacy-weighted") {
    return generateSeededRarityDrops(input);
  }
  const duration = requireDuration(input.configuration, input.durationId);
  return Array.from({ length: duration.dropCount }, (_, index) =>
    resolveSeededRarityDrop({ ...input, seed: `${input.seed}|drop:${index}`, strategy })
  );
}
