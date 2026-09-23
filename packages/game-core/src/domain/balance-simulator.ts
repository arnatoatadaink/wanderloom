import type { ProgressionState } from "./core-snapshot";
import type { ExplorationId, ZoneId } from "./ids";
import { applyProgressionExp, type ProgressionRule } from "./progression";
import { generateSeededRarityDrops, type ItemRarity, type ZoneRewardConfiguration } from "./rarity-zone-rewards";
import { resolveSeededExpedition, type SeededExpeditionResolutionConfig } from "./seeded-m1-resolution";

export interface BalanceSimulationInput {
  readonly seedPrefix: string;
  readonly iterations: number;
  readonly zoneId: ZoneId;
  readonly durationId: string;
  readonly expeditionConfig: SeededExpeditionResolutionConfig;
  readonly rewardConfiguration: ZoneRewardConfiguration;
  readonly initialProgression: ProgressionState;
  readonly progressionRule: ProgressionRule;
}

export interface BalanceSimulationReport {
  readonly iterations: number;
  readonly successes: number;
  readonly failures: number;
  readonly successRate: number;
  readonly retainedGoldTotal: number;
  readonly retainedExpTotal: number;
  readonly retainedGoldPerRun: number;
  readonly retainedExpPerRun: number;
  readonly generatedDropCount: number;
  readonly rarityCounts: Readonly<Partial<Record<ItemRarity, number>>>;
  readonly finalProgression: ProgressionState;
  readonly levelsGained: number;
}

export function simulateBalance(input: BalanceSimulationInput): BalanceSimulationReport {
  if (!Number.isSafeInteger(input.iterations) || input.iterations <= 0) {
    throw new RangeError("iterations must be a positive safe integer");
  }
  if (input.rewardConfiguration.zoneId !== input.zoneId) {
    throw new RangeError("zoneId does not match reward configuration");
  }

  let successes = 0;
  let failures = 0;
  let retainedGoldTotal = 0;
  let retainedExpTotal = 0;
  let generatedDropCount = 0;
  const rarityCounts: Partial<Record<ItemRarity, number>> = {};
  let progression = input.initialProgression;

  for (let index = 0; index < input.iterations; index += 1) {
    const seed = `${input.seedPrefix}:${index}`;
    const resolution = resolveSeededExpedition({
      seed,
      explorationId: `sim-${index}` as ExplorationId,
      zoneId: input.zoneId,
      durationId: input.durationId,
      config: input.expeditionConfig
    });
    if (resolution.result === "success") successes += 1;
    else failures += 1;

    retainedGoldTotal += resolution.rewards.retainedGold;
    retainedExpTotal += resolution.rewards.retainedExp;

    const drops = generateSeededRarityDrops({
      seed,
      zoneId: input.zoneId,
      durationId: input.durationId,
      configuration: input.rewardConfiguration
    });
    generatedDropCount += drops.length;
    for (const drop of drops) {
      rarityCounts[drop.rarity] = (rarityCounts[drop.rarity] ?? 0) + 1;
    }

    const applied = applyProgressionExp(progression, resolution.rewards.retainedExp, input.progressionRule);
    progression = {
      ...applied.next,
      gold: applied.next.gold + resolution.rewards.retainedGold
    };
  }

  return {
    iterations: input.iterations,
    successes,
    failures,
    successRate: successes / input.iterations,
    retainedGoldTotal,
    retainedExpTotal,
    retainedGoldPerRun: retainedGoldTotal / input.iterations,
    retainedExpPerRun: retainedExpTotal / input.iterations,
    generatedDropCount,
    rarityCounts,
    finalProgression: progression,
    levelsGained: progression.level - input.initialProgression.level
  };
}
