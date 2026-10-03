import {
  buildProductionContentBalanceMatrix,
  INITIAL_PRODUCTION_LOSS_POLICY,
  instantiateDrop,
  resolveSeededExpedition,
  type ActiveExploration,
  type ExplorationResolution,
  type ItemInstanceId
} from "@wanderloom/game-core";
import { resolveProductionGeneratedDrops } from "./production-rarity-drop";
import { resolveProductionDuration } from "./production-zone-catalog";

export function resolveProductionClaim(
  exploration: ActiveExploration,
  claimedAt?: string,
  createItemInstanceId?: () => ItemInstanceId
): ExplorationResolution | null {
  const duration = resolveProductionDuration(
    exploration.zoneId,
    exploration.durationId
  );
  if (duration === null) {
    return null;
  }

  const row = buildProductionContentBalanceMatrix().rows.find(
    (candidate) =>
      candidate.zone.zoneId === exploration.zoneId &&
      candidate.durationClass === duration.durationClass &&
      candidate.formationClass === "Solo"
  );
  if (!row) {
    return null;
  }

  const generatedDrops = resolveProductionGeneratedDrops(exploration) ?? [];
  const resolved = resolveSeededExpedition({
    seed: exploration.seed,
    explorationId: exploration.explorationId,
    zoneId: exploration.zoneId,
    durationId: exploration.durationId,
    config: {
      failureProbability: row.riskFailure.failureProbability,
      lossPolicy: INITIAL_PRODUCTION_LOSS_POLICY,
      generatedGold: row.economy.grossReward,
      generatedExp: row.lossExpectation.generatedExp,
      generatedDrops
    }
  });

  const retainedGoldAfterFixedCost = Math.max(
    0,
    resolved.rewards.retainedGold - row.economy.finalGoldRequirement
  );
  const retainedDrops =
    claimedAt !== undefined && createItemInstanceId !== undefined
      ? resolved.rewards.retainedDrops.map((generatedDrop) =>
          instantiateDrop({
            generatedDrop,
            itemInstanceId: createItemInstanceId(),
            createdAt: claimedAt
          })
        )
      : [];

  return {
    result: resolved.result,
    gold: retainedGoldAfterFixedCost,
    exp: resolved.rewards.retainedExp,
    drops: retainedDrops,
    summaryMetrics: {
      ...resolved.summaryMetrics,
      failureProbability: row.riskFailure.failureProbability,
      generatedGold: row.economy.grossReward,
      fixedGoldCost: row.economy.finalGoldRequirement,
      generatedExp: row.lossExpectation.generatedExp,
      retainedGoldBeforeFixedCost: resolved.rewards.retainedGold,
      retainedGoldAfterFixedCost,
      retainedExp: resolved.rewards.retainedExp,
      generatedDropCount: generatedDrops.length,
      retainedDropCount: resolved.rewards.retainedDrops.length
    }
  };
}
