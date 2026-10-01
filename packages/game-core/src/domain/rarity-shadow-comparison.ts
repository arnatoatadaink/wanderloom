import type { ZoneId } from "./ids";
import {
  calculateRarityOpportunityMetrics,
  type RarityOpportunityMetrics
} from "./duration-rarity-model";
import {
  ITEM_RARITIES,
  type ItemRarity,
  type ZoneRewardConfiguration
} from "./rarity-zone-rewards";
import {
  resolveSeededRarityDrop,
  type RarityResolutionStrategy
} from "./rarity-resolution-strategy";

export interface RarityShadowComparisonInput {
  readonly seedPrefix: string;
  readonly iterations: number;
  readonly zoneId: ZoneId;
  readonly durationId: string;
  readonly configuration: ZoneRewardConfiguration;
  readonly candidateStrategy: Extract<RarityResolutionStrategy, { kind: "student-t" }>;
}

export interface RarityShadowStrategySummary {
  readonly rarityCounts: Readonly<Record<ItemRarity, number>>;
  readonly probabilityByRarity: Readonly<Record<ItemRarity, number>>;
  readonly opportunity: RarityOpportunityMetrics;
}

export interface RarityShadowComparisonReport {
  readonly iterations: number;
  readonly sameRarityCount: number;
  readonly sameRarityRate: number;
  readonly legacy: RarityShadowStrategySummary;
  readonly candidate: RarityShadowStrategySummary;
  readonly probabilityDeltaCandidateMinusLegacy: Readonly<Record<ItemRarity, number>>;
  readonly expectedRarityScoreDelta: number;
}

function emptyCounts(): Record<ItemRarity, number> {
  return Object.fromEntries(ITEM_RARITIES.map((rarity) => [rarity, 0])) as Record<ItemRarity, number>;
}

function toSummary(
  counts: Readonly<Record<ItemRarity, number>>,
  iterations: number
): RarityShadowStrategySummary {
  const probabilityByRarity = Object.fromEntries(
    ITEM_RARITIES.map((rarity) => [rarity, counts[rarity] / iterations])
  ) as Record<ItemRarity, number>;
  return {
    rarityCounts: counts,
    probabilityByRarity,
    opportunity: calculateRarityOpportunityMetrics(probabilityByRarity)
  };
}

export function compareRarityResolutionStrategies(
  input: RarityShadowComparisonInput
): RarityShadowComparisonReport {
  if (!Number.isSafeInteger(input.iterations) || input.iterations <= 0) {
    throw new RangeError("iterations must be a positive safe integer");
  }
  if (input.configuration.zoneId !== input.zoneId) {
    throw new RangeError("zoneId does not match reward configuration");
  }

  const legacyCounts = emptyCounts();
  const candidateCounts = emptyCounts();
  let sameRarityCount = 0;

  for (let index = 0; index < input.iterations; index += 1) {
    const seed = `${input.seedPrefix}:${index}`;
    const commonInput = {
      seed,
      zoneId: input.zoneId,
      durationId: input.durationId,
      configuration: input.configuration
    } as const;

    const legacy = resolveSeededRarityDrop({
      ...commonInput,
      strategy: { kind: "legacy-weighted" }
    });
    const candidate = resolveSeededRarityDrop({
      ...commonInput,
      strategy: input.candidateStrategy
    });

    legacyCounts[legacy.rarity] += 1;
    candidateCounts[candidate.rarity] += 1;
    if (legacy.rarity === candidate.rarity) sameRarityCount += 1;
  }

  const legacy = toSummary(legacyCounts, input.iterations);
  const candidate = toSummary(candidateCounts, input.iterations);
  const probabilityDeltaCandidateMinusLegacy = Object.fromEntries(
    ITEM_RARITIES.map((rarity) => [
      rarity,
      candidate.probabilityByRarity[rarity] - legacy.probabilityByRarity[rarity]
    ])
  ) as Record<ItemRarity, number>;

  return {
    iterations: input.iterations,
    sameRarityCount,
    sameRarityRate: sameRarityCount / input.iterations,
    legacy,
    candidate,
    probabilityDeltaCandidateMinusLegacy,
    expectedRarityScoreDelta:
      candidate.opportunity.expectedRarityScore - legacy.opportunity.expectedRarityScore
  };
}
