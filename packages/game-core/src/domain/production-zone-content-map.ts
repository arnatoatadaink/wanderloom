import type { ZoneId } from "./ids";
import type { ProductionZoneRarityTier } from "./production-zone-rarity-calibration";

export interface ProductionZoneContentDefinition {
  readonly zoneId: ZoneId;
  readonly displayName: string;
  /** Monotonic content progression gate. This is intentionally decoupled from player level. */
  readonly minimumZoneRank: number;
  readonly rarityTier: ProductionZoneRarityTier;
  /** Tunable relative danger in [0, 1]. */
  readonly riskIndex: number;
  /** Visible baseline Gold reward before duration/risk/formation modifiers. */
  readonly baseRewardGold: number;
  /** Travel/access Gold cost. Operational formation cost remains separate. */
  readonly travelCostGold: number;
}

function zoneId(value: string): ZoneId {
  return value as ZoneId;
}

export const INITIAL_PRODUCTION_ZONE_CONTENT_MAP: readonly ProductionZoneContentDefinition[] = [
  {
    zoneId: zoneId("wayfarer-meadow"),
    displayName: "Wayfarer Meadow",
    minimumZoneRank: 0,
    rarityTier: "Tier1",
    riskIndex: 0.10,
    baseRewardGold: 10,
    travelCostGold: 0
  },
  {
    zoneId: zoneId("mossglass-grove"),
    displayName: "Mossglass Grove",
    minimumZoneRank: 1,
    rarityTier: "Tier1",
    riskIndex: 0.16,
    baseRewardGold: 14,
    travelCostGold: 1
  },
  {
    zoneId: zoneId("shattered-causeway"),
    displayName: "Shattered Causeway",
    minimumZoneRank: 2,
    rarityTier: "Tier2",
    riskIndex: 0.24,
    baseRewardGold: 20,
    travelCostGold: 2
  },
  {
    zoneId: zoneId("ashwind-highlands"),
    displayName: "Ashwind Highlands",
    minimumZoneRank: 3,
    rarityTier: "Tier2",
    riskIndex: 0.32,
    baseRewardGold: 28,
    travelCostGold: 3
  },
  {
    zoneId: zoneId("starfall-frontier"),
    displayName: "Starfall Frontier",
    minimumZoneRank: 4,
    rarityTier: "Tier3",
    riskIndex: 0.42,
    baseRewardGold: 40,
    travelCostGold: 5
  }
] as const;

export function validateProductionZoneContentMap(
  zones: readonly ProductionZoneContentDefinition[] = INITIAL_PRODUCTION_ZONE_CONTENT_MAP
): void {
  if (zones.length === 0) throw new RangeError("at least one production zone must be configured");

  const ids = new Set<string>();
  let previousRank = -1;
  let previousRisk = -1;
  let previousBaseReward = -1;
  let previousTravelCost = -1;

  for (const zone of zones) {
    if (zone.displayName.trim().length === 0) throw new RangeError("zone displayName must not be empty");
    if (ids.has(zone.zoneId)) throw new RangeError("zoneId must be unique");
    ids.add(zone.zoneId);

    if (!Number.isSafeInteger(zone.minimumZoneRank) || zone.minimumZoneRank < 0) {
      throw new RangeError("minimumZoneRank must be a non-negative safe integer");
    }
    if (!Number.isFinite(zone.riskIndex) || zone.riskIndex < 0 || zone.riskIndex > 1) {
      throw new RangeError("riskIndex must be between 0 and 1");
    }
    if (!Number.isSafeInteger(zone.baseRewardGold) || zone.baseRewardGold < 0) {
      throw new RangeError("baseRewardGold must be a non-negative safe integer");
    }
    if (!Number.isSafeInteger(zone.travelCostGold) || zone.travelCostGold < 0) {
      throw new RangeError("travelCostGold must be a non-negative safe integer");
    }

    if (zone.minimumZoneRank <= previousRank) {
      throw new RangeError("zone ranks must be strictly increasing");
    }
    if (zone.riskIndex < previousRisk) throw new RangeError("zone risk must be non-decreasing");
    if (zone.baseRewardGold < previousBaseReward) {
      throw new RangeError("zone base reward must be non-decreasing");
    }
    if (zone.travelCostGold < previousTravelCost) {
      throw new RangeError("zone travel cost must be non-decreasing");
    }

    previousRank = zone.minimumZoneRank;
    previousRisk = zone.riskIndex;
    previousBaseReward = zone.baseRewardGold;
    previousTravelCost = zone.travelCostGold;
  }
}

export function availableProductionZonesForRank(
  zoneRank: number,
  zones: readonly ProductionZoneContentDefinition[] = INITIAL_PRODUCTION_ZONE_CONTENT_MAP
): readonly ProductionZoneContentDefinition[] {
  if (!Number.isSafeInteger(zoneRank) || zoneRank < 0) {
    throw new RangeError("zoneRank must be a non-negative safe integer");
  }
  validateProductionZoneContentMap(zones);
  return zones.filter((zone) => zone.minimumZoneRank <= zoneRank);
}

export function getProductionZoneContent(
  requestedZoneId: ZoneId,
  zones: readonly ProductionZoneContentDefinition[] = INITIAL_PRODUCTION_ZONE_CONTENT_MAP
): ProductionZoneContentDefinition {
  validateProductionZoneContentMap(zones);
  const found = zones.find((zone) => zone.zoneId === requestedZoneId);
  if (!found) throw new RangeError("unknown production zone");
  return found;
}
