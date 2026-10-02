import {
  INITIAL_PRODUCTION_ZONE_CONTENT_MAP,
  type DurationClass,
  type ZoneId
} from "@wanderloom/game-core";

export interface ProductionDurationCatalogEntry {
  readonly durationId: "short" | "medium" | "long";
  readonly durationClass: DurationClass;
  readonly durationMs: number;
}

export interface ProductionZoneCatalogEntry {
  readonly zoneId: ZoneId;
  readonly name: string;
  readonly minimumZoneRank: number;
  readonly unlocked: boolean;
  readonly durations: readonly ProductionDurationCatalogEntry[];
}

export const PRODUCTION_DURATION_CATALOG: readonly ProductionDurationCatalogEntry[] = [
  {
    durationId: "short",
    durationClass: "Short",
    durationMs: 30 * 60 * 1000
  },
  {
    durationId: "medium",
    durationClass: "Medium",
    durationMs: 2 * 60 * 60 * 1000
  },
  {
    durationId: "long",
    durationClass: "Long",
    durationMs: 8 * 60 * 60 * 1000
  }
] as const;

export function buildProductionZoneCatalog(
  zoneRank: number
): readonly ProductionZoneCatalogEntry[] {
  if (!Number.isSafeInteger(zoneRank) || zoneRank < 0) {
    throw new RangeError("zoneRank must be a non-negative safe integer");
  }

  return INITIAL_PRODUCTION_ZONE_CONTENT_MAP.map((zone) => ({
    zoneId: zone.zoneId,
    name: zone.displayName,
    minimumZoneRank: zone.minimumZoneRank,
    unlocked: zone.minimumZoneRank <= zoneRank,
    durations: PRODUCTION_DURATION_CATALOG
  }));
}

export function resolveProductionDuration(
  zoneId: ZoneId,
  durationId: string
): ProductionDurationCatalogEntry | null {
  const zoneExists = INITIAL_PRODUCTION_ZONE_CONTENT_MAP.some(
    (zone) => zone.zoneId === zoneId
  );
  if (!zoneExists) {
    return null;
  }

  return PRODUCTION_DURATION_CATALOG.find(
    (duration) => duration.durationId === durationId
  ) ?? null;
}
