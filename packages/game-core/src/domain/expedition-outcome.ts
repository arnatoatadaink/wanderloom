import type { GeneratedDrop } from "./reward-drop-contract";

export type ExpeditionOutcome = "success" | "failure";

export interface LossPolicy {
  /** Fraction retained on failure. Values must be within [0, 1]. */
  readonly retainedGoldRatio: number;
  readonly retainedExpRatio: number;
  /** M2 default is false: newly generated drops are lost on failure. */
  readonly retainGeneratedDrops: boolean;
}

export interface ExpeditionRiskPreview {
  readonly failureProbability: number;
  readonly lossPolicy: LossPolicy;
}

export interface FailureResolution {
  readonly outcome: "failure";
  readonly retainedGold: number;
  readonly retainedExp: number;
  readonly retainedDrops: readonly GeneratedDrop[];
  readonly lostGold: number;
  readonly lostExp: number;
  readonly lostDrops: readonly GeneratedDrop[];
}

export interface SuccessResolution {
  readonly outcome: "success";
  readonly retainedGold: number;
  readonly retainedExp: number;
  readonly retainedDrops: readonly GeneratedDrop[];
  readonly lostGold: 0;
  readonly lostExp: 0;
  readonly lostDrops: readonly [];
}

export type ExpeditionRewardResolution = SuccessResolution | FailureResolution;

export interface ResolveExpeditionRewardsInput {
  readonly outcome: ExpeditionOutcome;
  readonly generatedGold: number;
  readonly generatedExp: number;
  readonly generatedDrops: readonly GeneratedDrop[];
  readonly lossPolicy: LossPolicy;
}

function assertRatio(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be a finite number within [0, 1]`);
  }
}

function retainedAmount(generated: number, ratio: number): number {
  if (!Number.isFinite(generated) || generated < 0) {
    throw new RangeError("generated reward must be a finite non-negative number");
  }
  return Math.floor(generated * ratio);
}

export function resolveExpeditionRewards(
  input: ResolveExpeditionRewardsInput
): ExpeditionRewardResolution {
  if (input.outcome === "success") {
    return {
      outcome: "success",
      retainedGold: input.generatedGold,
      retainedExp: input.generatedExp,
      retainedDrops: input.generatedDrops,
      lostGold: 0,
      lostExp: 0,
      lostDrops: []
    };
  }

  assertRatio(input.lossPolicy.retainedGoldRatio, "retainedGoldRatio");
  assertRatio(input.lossPolicy.retainedExpRatio, "retainedExpRatio");

  const retainedGold = retainedAmount(
    input.generatedGold,
    input.lossPolicy.retainedGoldRatio
  );
  const retainedExp = retainedAmount(
    input.generatedExp,
    input.lossPolicy.retainedExpRatio
  );
  const retainedDrops = input.lossPolicy.retainGeneratedDrops
    ? input.generatedDrops
    : [];
  const lostDrops = input.lossPolicy.retainGeneratedDrops
    ? []
    : input.generatedDrops;

  return {
    outcome: "failure",
    retainedGold,
    retainedExp,
    retainedDrops,
    lostGold: input.generatedGold - retainedGold,
    lostExp: input.generatedExp - retainedExp,
    lostDrops
  };
}

export function createExpeditionRiskPreview(
  failureProbability: number,
  lossPolicy: LossPolicy
): ExpeditionRiskPreview {
  assertRatio(failureProbability, "failureProbability");
  assertRatio(lossPolicy.retainedGoldRatio, "retainedGoldRatio");
  assertRatio(lossPolicy.retainedExpRatio, "retainedExpRatio");
  return { failureProbability, lossPolicy };
}
