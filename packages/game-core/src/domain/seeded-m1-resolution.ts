import type { ExpeditionOutcome, ExpeditionRewardResolution, LossPolicy } from "./expedition-outcome";
import { resolveExpeditionRewards } from "./expedition-outcome";
import type { ExplorationId, ItemDefinitionId, ZoneId } from "./ids";
import type { GeneratedDrop } from "./reward-drop-contract";

export interface SeededM1ResolutionInput {
  readonly seed: string;
  readonly explorationId: ExplorationId;
  readonly zoneId: ZoneId;
  readonly durationId: string;
}

export interface SeededM1Resolution {
  readonly result: "success";
  readonly gold: number;
  readonly exp: number;
  readonly generatedDrops: readonly GeneratedDrop[];
  readonly summaryMetrics: Readonly<Record<string, number>>;
}

export interface SeededExpeditionResolutionConfig {
  readonly failureProbability: number;
  readonly lossPolicy: LossPolicy;
}

export interface SeededExpeditionResolutionInput extends SeededM1ResolutionInput {
  readonly config: SeededExpeditionResolutionConfig;
}

export interface SeededExpeditionResolution {
  readonly result: ExpeditionOutcome;
  readonly generatedGold: number;
  readonly generatedExp: number;
  readonly generatedDrops: readonly GeneratedDrop[];
  readonly rewards: ExpeditionRewardResolution;
  readonly summaryMetrics: Readonly<Record<string, number>>;
}

export const M1_WAYFARER_CHARM_ITEM_DEFINITION_ID =
  "m1-wayfarer-charm" as ItemDefinitionId;

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function hashResolutionInput(input: SeededM1ResolutionInput): number {
  return hashSeed(
    [input.seed, input.explorationId, input.zoneId, input.durationId].join("|")
  );
}

function assertProbability(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError("failureProbability must be a finite number within [0, 1]");
  }
}

export function resolveSeededM1Exploration(
  input: SeededM1ResolutionInput
): SeededM1Resolution {
  const seedHash = hashSeed(input.seed);
  return {
    result: "success",
    gold: 5 + (seedHash % 2),
    exp: 10,
    generatedDrops: [{ itemDefinitionId: M1_WAYFARER_CHARM_ITEM_DEFINITION_ID }],
    summaryMetrics: { seedBucket: seedHash % 2 }
  };
}

export function resolveSeededExpedition(
  input: SeededExpeditionResolutionInput
): SeededExpeditionResolution {
  assertProbability(input.config.failureProbability);
  const resolutionHash = hashResolutionInput(input);
  const generatedGold = 5 + (resolutionHash % 2);
  const generatedExp = 10;
  const generatedDrops: readonly GeneratedDrop[] = [
    { itemDefinitionId: M1_WAYFARER_CHARM_ITEM_DEFINITION_ID }
  ];
  const roll = resolutionHash / 0x100000000;
  const result: ExpeditionOutcome =
    roll < input.config.failureProbability ? "failure" : "success";
  const rewards = resolveExpeditionRewards({
    outcome: result,
    generatedGold,
    generatedExp,
    generatedDrops,
    lossPolicy: input.config.lossPolicy
  });

  return {
    result,
    generatedGold,
    generatedExp,
    generatedDrops,
    rewards,
    summaryMetrics: {
      seedBucket: resolutionHash % 2,
      failureRoll: roll
    }
  };
}
