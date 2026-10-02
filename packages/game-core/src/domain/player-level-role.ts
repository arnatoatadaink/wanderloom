import { INITIAL_PRODUCTION_MAX_LEVEL } from "./production-progression-curve";

export interface PlayerLevelRoleEffects {
  readonly level: number;
  readonly statModifiers: Readonly<Record<string, number>>;
  readonly failureProbabilityMultiplier: number;
  readonly goldRewardMultiplier: number;
  readonly zoneRankBonus: number;
}

function assertProductionLevel(level: number): void {
  if (!Number.isSafeInteger(level) || level < 1 || level > INITIAL_PRODUCTION_MAX_LEVEL) {
    throw new RangeError(
      `level must be a safe integer within [1, ${INITIAL_PRODUCTION_MAX_LEVEL}]`
    );
  }
}

/**
 * Initial L3 role contract for Player Level.
 *
 * Level is progression/achievement state only. It does not directly modify
 * character combat stats, failure probability, Gold output, or Zone access.
 * Equipment and Zone Rank remain the authoritative power/access axes.
 */
export function resolvePlayerLevelRoleEffects(level: number): PlayerLevelRoleEffects {
  assertProductionLevel(level);

  return {
    level,
    statModifiers: {},
    failureProbabilityMultiplier: 1,
    goldRewardMultiplier: 1,
    zoneRankBonus: 0
  };
}
