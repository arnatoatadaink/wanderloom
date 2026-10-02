import type { ProgressionRule } from "./progression";

export const INITIAL_PRODUCTION_MAX_LEVEL = 10;
export const INITIAL_PRODUCTION_EXP_SCALE = 30;

export interface ProductionProgressionCurveRow {
  readonly level: number;
  readonly nextLevel: number;
  readonly expRequired: number;
  readonly cumulativeExpFromLevelOne: number;
}

function assertProgressionLevel(level: number): void {
  if (!Number.isSafeInteger(level) || level < 1 || level >= INITIAL_PRODUCTION_MAX_LEVEL) {
    throw new RangeError(
      `level must be a safe integer within [1, ${INITIAL_PRODUCTION_MAX_LEVEL - 1}]`
    );
  }
}

/**
 * Initial production-candidate level curve.
 * Quadratic growth prevents high-zone long expeditions from skipping too many levels
 * while keeping the first level-up reachable within a few starter-zone short runs.
 */
export function initialProductionExpRequiredForLevel(level: number): number {
  assertProgressionLevel(level);
  return INITIAL_PRODUCTION_EXP_SCALE * level * level;
}

export const INITIAL_PRODUCTION_PROGRESSION_RULE: ProgressionRule = {
  maxLevel: INITIAL_PRODUCTION_MAX_LEVEL,
  expRequiredForLevel: initialProductionExpRequiredForLevel
};

export function buildInitialProductionProgressionCurve(): readonly ProductionProgressionCurveRow[] {
  const rows: ProductionProgressionCurveRow[] = [];
  let cumulativeExpFromLevelOne = 0;

  for (let level = 1; level < INITIAL_PRODUCTION_MAX_LEVEL; level += 1) {
    const expRequired = initialProductionExpRequiredForLevel(level);
    cumulativeExpFromLevelOne += expRequired;
    rows.push({
      level,
      nextLevel: level + 1,
      expRequired,
      cumulativeExpFromLevelOne
    });
  }

  return rows;
}

export function estimateRunsToNextLevel(input: {
  readonly level: number;
  readonly expectedExpPerRun: number;
}): number {
  assertProgressionLevel(input.level);
  if (!Number.isFinite(input.expectedExpPerRun) || input.expectedExpPerRun <= 0) {
    throw new RangeError("expectedExpPerRun must be a finite positive number");
  }

  return initialProductionExpRequiredForLevel(input.level) / input.expectedExpPerRun;
}
