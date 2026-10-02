import type { DurationClass } from "./formation-economy-model";

export interface RiskFailureProbabilityParameters {
  readonly baseFailureProbability: number;
  readonly riskWeight: number;
  readonly durationExposureMultiplier: Readonly<Record<DurationClass, number>>;
  readonly maxFailureProbability: number;
}

export interface RiskFailureProbabilityInput {
  readonly riskIndex: number;
  readonly durationClass: DurationClass;
  readonly parameters?: RiskFailureProbabilityParameters;
}

export interface RiskFailureProbabilityMetrics {
  readonly riskIndex: number;
  readonly durationClass: DurationClass;
  readonly baseFailureProbability: number;
  readonly riskContribution: number;
  readonly durationExposureMultiplier: number;
  readonly unclampedFailureProbability: number;
  readonly failureProbability: number;
}

/**
 * Initial L3 simulation baseline. These values are calibration inputs, not a
 * production-live commitment.
 */
export const INITIAL_RISK_FAILURE_PROBABILITY_PARAMETERS: RiskFailureProbabilityParameters = {
  baseFailureProbability: 0.02,
  riskWeight: 0.20,
  durationExposureMultiplier: {
    Short: 0.75,
    Medium: 1.0,
    Long: 1.25
  },
  maxFailureProbability: 0.15
};

function assertProbability(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be a finite number within [0, 1]`);
  }
}

function validateParameters(parameters: RiskFailureProbabilityParameters): void {
  assertProbability(parameters.baseFailureProbability, "baseFailureProbability");
  if (!Number.isFinite(parameters.riskWeight) || parameters.riskWeight < 0) {
    throw new RangeError("riskWeight must be a finite non-negative number");
  }
  assertProbability(parameters.maxFailureProbability, "maxFailureProbability");
  if (parameters.maxFailureProbability < parameters.baseFailureProbability) {
    throw new RangeError("maxFailureProbability must be >= baseFailureProbability");
  }

  for (const durationClass of ["Short", "Medium", "Long"] as const) {
    const multiplier = parameters.durationExposureMultiplier[durationClass];
    if (!Number.isFinite(multiplier) || multiplier < 0) {
      throw new RangeError("duration exposure multipliers must be finite non-negative numbers");
    }
  }
}

export function calculateRiskFailureProbability(
  input: RiskFailureProbabilityInput
): RiskFailureProbabilityMetrics {
  assertProbability(input.riskIndex, "riskIndex");
  const parameters = input.parameters ?? INITIAL_RISK_FAILURE_PROBABILITY_PARAMETERS;
  validateParameters(parameters);

  const durationExposureMultiplier = parameters.durationExposureMultiplier[input.durationClass];
  const riskContribution = input.riskIndex * parameters.riskWeight * durationExposureMultiplier;
  const unclampedFailureProbability = parameters.baseFailureProbability + riskContribution;
  const failureProbability = Math.min(
    parameters.maxFailureProbability,
    unclampedFailureProbability
  );

  return {
    riskIndex: input.riskIndex,
    durationClass: input.durationClass,
    baseFailureProbability: parameters.baseFailureProbability,
    riskContribution,
    durationExposureMultiplier,
    unclampedFailureProbability,
    failureProbability
  };
}
