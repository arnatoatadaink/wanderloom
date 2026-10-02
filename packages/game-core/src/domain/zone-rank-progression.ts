import type { ZoneId } from "./ids";
import {
  INITIAL_PRODUCTION_ZONE_CONTENT_MAP,
  getProductionZoneContent,
  type ProductionZoneContentDefinition
} from "./production-zone-content-map";

export interface ZoneRankProgressionInput {
  readonly currentZoneRank: number;
  readonly completedZoneId: ZoneId;
  readonly succeeded: boolean;
}

export interface ZoneRankProgressionResult {
  readonly previousZoneRank: number;
  readonly nextZoneRank: number;
  readonly rankAdvanced: boolean;
  readonly completedZoneRank: number;
  readonly nextUnlockedZoneId: ZoneId | null;
}

function assertZoneRank(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("currentZoneRank must be a non-negative safe integer");
  }
}

/**
 * Initial simple Zone Rank progression rule:
 * successfully complete the zone whose minimumZoneRank equals the player's current
 * Zone Rank to unlock the next rank. Failure, replaying lower-rank zones, or clearing
 * the final configured zone does not advance rank.
 */
export function resolveZoneRankProgression(
  input: ZoneRankProgressionInput,
  zones: readonly ProductionZoneContentDefinition[] = INITIAL_PRODUCTION_ZONE_CONTENT_MAP
): ZoneRankProgressionResult {
  assertZoneRank(input.currentZoneRank);
  const completedZone = getProductionZoneContent(input.completedZoneId, zones);
  const highestConfiguredRank = Math.max(...zones.map((zone) => zone.minimumZoneRank));

  const canAdvance =
    input.succeeded &&
    input.currentZoneRank < highestConfiguredRank &&
    completedZone.minimumZoneRank === input.currentZoneRank;

  const nextZoneRank = canAdvance ? input.currentZoneRank + 1 : input.currentZoneRank;
  const nextUnlockedZone = canAdvance
    ? zones.find((zone) => zone.minimumZoneRank === nextZoneRank) ?? null
    : null;

  return {
    previousZoneRank: input.currentZoneRank,
    nextZoneRank,
    rankAdvanced: canAdvance,
    completedZoneRank: completedZone.minimumZoneRank,
    nextUnlockedZoneId: nextUnlockedZone?.zoneId ?? null
  };
}
