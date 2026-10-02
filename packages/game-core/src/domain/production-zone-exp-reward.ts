import type { DurationClass } from "./formation-economy-model";
import type { ZoneId } from "./ids";
import {
  INITIAL_PRODUCTION_ZONE_CONTENT_MAP,
  type ProductionZoneContentDefinition
} from "./production-zone-content-map";

export interface ProductionZoneExpRewardDefinition {
  readonly zoneId: ZoneId;
  readonly shortExp: number;
  readonly mediumExp: number;
  readonly longExp: number;
}

export interface ProductionZoneExpRewardMetrics {
  readonly zoneId: ZoneId;
  readonly durationClass: DurationClass;
  readonly generatedExp: number;
  readonly durationHours: number;
  readonly expPerHour: number;
}

const DURATION_HOURS: Readonly<Record<DurationClass, number>> = {
  Short: 0.5,
  Medium: 2,
  Long: 8
};

/**
 * Initial L4 EXP reward table.
 * Short establishes the zone progression baseline. Medium and Long intentionally
 * provide lower EXP/hour so elapsed duration alone does not dominate active play.
 */
export const INITIAL_PRODUCTION_ZONE_EXP_REWARD_TABLE: readonly ProductionZoneExpRewardDefinition[] = [
  { zoneId: INITIAL_PRODUCTION_ZONE_CONTENT_MAP[0]!.zoneId, shortExp: 8, mediumExp: 28, longExp: 80 },
  { zoneId: INITIAL_PRODUCTION_ZONE_CONTENT_MAP[1]!.zoneId, shortExp: 11, mediumExp: 39, longExp: 110 },
  { zoneId: INITIAL_PRODUCTION_ZONE_CONTENT_MAP[2]!.zoneId, shortExp: 16, mediumExp: 56, longExp: 160 },
  { zoneId: INITIAL_PRODUCTION_ZONE_CONTENT_MAP[3]!.zoneId, shortExp: 22, mediumExp: 77, longExp: 220 },
  { zoneId: INITIAL_PRODUCTION_ZONE_CONTENT_MAP[4]!.zoneId, shortExp: 30, mediumExp: 105, longExp: 300 }
] as const;

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

export function validateProductionZoneExpRewardTable(
  table: readonly ProductionZoneExpRewardDefinition[] = INITIAL_PRODUCTION_ZONE_EXP_REWARD_TABLE,
  zones: readonly ProductionZoneContentDefinition[] = INITIAL_PRODUCTION_ZONE_CONTENT_MAP
): void {
  if (table.length !== zones.length) {
    throw new RangeError("EXP reward table must define exactly one row per production zone");
  }

  const expectedZoneIds = new Set(zones.map((zone) => zone.zoneId));
  const seen = new Set<ZoneId>();
  let previousShort = -1;
  let previousMedium = -1;
  let previousLong = -1;

  for (const row of table) {
    if (!expectedZoneIds.has(row.zoneId)) throw new RangeError("EXP reward table contains unknown zoneId");
    if (seen.has(row.zoneId)) throw new RangeError("EXP reward table zoneId must be unique");
    seen.add(row.zoneId);

    assertPositiveSafeInteger(row.shortExp, "shortExp");
    assertPositiveSafeInteger(row.mediumExp, "mediumExp");
    assertPositiveSafeInteger(row.longExp, "longExp");

    if (!(row.shortExp < row.mediumExp && row.mediumExp < row.longExp)) {
      throw new RangeError("EXP reward must increase with duration");
    }
    if (row.shortExp <= previousShort || row.mediumExp <= previousMedium || row.longExp <= previousLong) {
      throw new RangeError("EXP reward must increase with zone progression");
    }

    const shortPerHour = row.shortExp / DURATION_HOURS.Short;
    const mediumPerHour = row.mediumExp / DURATION_HOURS.Medium;
    const longPerHour = row.longExp / DURATION_HOURS.Long;
    if (!(shortPerHour > mediumPerHour && mediumPerHour > longPerHour)) {
      throw new RangeError("EXP/hour must decrease with duration in the initial table");
    }

    previousShort = row.shortExp;
    previousMedium = row.mediumExp;
    previousLong = row.longExp;
  }
}

export function getProductionZoneExpReward(
  zoneId: ZoneId,
  durationClass: DurationClass,
  table: readonly ProductionZoneExpRewardDefinition[] = INITIAL_PRODUCTION_ZONE_EXP_REWARD_TABLE
): ProductionZoneExpRewardMetrics {
  validateProductionZoneExpRewardTable(table);
  const row = table.find((candidate) => candidate.zoneId === zoneId);
  if (!row) throw new RangeError("unknown production zone EXP reward");

  const generatedExp = durationClass === "Short"
    ? row.shortExp
    : durationClass === "Medium"
      ? row.mediumExp
      : row.longExp;
  const durationHours = DURATION_HOURS[durationClass];

  return {
    zoneId,
    durationClass,
    generatedExp,
    durationHours,
    expPerHour: generatedExp / durationHours
  };
}
