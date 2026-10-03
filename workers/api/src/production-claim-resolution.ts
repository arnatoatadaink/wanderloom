import {
  buildProductionContentBalanceMatrix,
  INITIAL_PRODUCTION_LOSS_POLICY,
  resolveSeededExpedition,
  type ActiveExploration,
  type ExplorationResolution
} from "@wanderloom/game-core";
import { resolveProductionDuration } from "./production-zone-catalog";

export function resolveProductionClaim(
  exploration: ActiveExploration
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
      generatedDrops: []
    }
  });

  const retainedGoldAfterFixedCost = Math.max(
    0,
    resolved.rewards.retainedGold - row.economy.finalGoldRequirement
  );

  return {
    result: resolved.result,
    gold: retainedGoldAfterFixedCost,
    exp: resolved.rewards.retainedExp,
    drops: [],
    summaryMetrics: {
      ...resolved.summaryMetrics,
      failureProbability: row.riskFailure.failureProbability,
      generatedGold: row.economy.grossReward,
      fixedGoldCost: row.economy.finalGoldRequirement,
      generatedExp: row.lossExpectation.generatedExp,
      retainedGoldBeforeFixedCost: resolved.rewards.retainedGold,
      retainedGoldAfterFixedCost,
      retainedExp: resolved.rewards.retainedExp
    }
  };
}
