import type { LossPolicy } from "./expedition-outcome";

export interface ProductionLossPolicyExpectationInput {
  readonly failureProbability: number;
  readonly generatedGold: number;
  readonly generatedExp: number;
  readonly generatedDropCount?: number;
  readonly fixedGoldCost?: number;
  readonly lossPolicy?: LossPolicy;
}

export interface ProductionLossPolicyExpectationMetrics {
  readonly failureProbability: number;
  readonly lossPolicy: LossPolicy;
  readonly expectedGoldRetentionRatio: number;
  readonly expectedExpRetentionRatio: number;
  readonly expectedDropRetentionRatio: number;
  readonly expectedGoldBeforeFixedCost: number;
  readonly expectedGoldAfterFixedCost: number;
  readonly expectedExp: number;
  readonly expectedRetainedDropCount: number;
}

/**
 * Initial production-candidate severity baseline.
 * Failure frequency remains controlled separately by risk-failure-probability.
 */
export const INITIAL_PRODUCTION_LOSS_POLICY: LossPolicy = {
  retainedGoldRatio: 0.5,
  retainedExpRatio: 0.5,
  retainGeneratedDrops: false
};

function assertProbability(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be a finite number within [0, 1]`);
  }
}

function assertNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number`);
  }
}

export function calculateProductionLossPolicyExpectation(
  input: ProductionLossPolicyExpectationInput
): ProductionLossPolicyExpectationMetrics {
  assertProbability(input.failureProbability, "failureProbability");
  assertNonNegative(input.generatedGold, "generatedGold");
  assertNonNegative(input.generatedExp, "generatedExp");
  assertNonNegative(input.generatedDropCount ?? 0, "generatedDropCount");
  assertNonNegative(input.fixedGoldCost ?? 0, "fixedGoldCost");

  const lossPolicy = input.lossPolicy ?? INITIAL_PRODUCTION_LOSS_POLICY;
  assertProbability(lossPolicy.retainedGoldRatio, "retainedGoldRatio");
  assertProbability(lossPolicy.retainedExpRatio, "retainedExpRatio");

  const successProbability = 1 - input.failureProbability;
  const expectedGoldRetentionRatio =
    successProbability + input.failureProbability * lossPolicy.retainedGoldRatio;
  const expectedExpRetentionRatio =
    successProbability + input.failureProbability * lossPolicy.retainedExpRatio;
  const expectedDropRetentionRatio = lossPolicy.retainGeneratedDrops
    ? 1
    : successProbability;

  const expectedGoldBeforeFixedCost = input.generatedGold * expectedGoldRetentionRatio;
  const fixedGoldCost = input.fixedGoldCost ?? 0;

  return {
    failureProbability: input.failureProbability,
    lossPolicy,
    expectedGoldRetentionRatio,
    expectedExpRetentionRatio,
    expectedDropRetentionRatio,
    expectedGoldBeforeFixedCost,
    expectedGoldAfterFixedCost: expectedGoldBeforeFixedCost - fixedGoldCost,
    expectedExp: input.generatedExp * expectedExpRetentionRatio,
    expectedRetainedDropCount: (input.generatedDropCount ?? 0) * expectedDropRetentionRatio
  };
}
