import {
  INITIAL_DURATION_RARITY_DF,
  INITIAL_MEDIUM_T_THRESHOLDS,
  type DurationRarityThresholds
} from "./duration-rarity-model";
import type { ItemRarity } from "./rarity-zone-rewards";
import type { RarityResolutionStrategy } from "./rarity-resolution-strategy";

export type ProductionZoneRarityTier = "Tier1" | "Tier2" | "Tier3";
export type ProductionZoneDurationClass = "Short" | "Medium" | "Long";

export interface ProductionZoneRarityCalibration {
  readonly tier: ProductionZoneRarityTier;
  readonly reachableRarities: readonly ItemRarity[];
  readonly thresholds: DurationRarityThresholds;
}

export const INITIAL_PRODUCTION_ZONE_RARITY_CALIBRATIONS: Readonly<
  Record<ProductionZoneRarityTier, ProductionZoneRarityCalibration>
> = {
  Tier1: {
    tier: "Tier1",
    reachableRarities: ["Common", "Uncommon", "Rare"],
    thresholds: INITIAL_MEDIUM_T_THRESHOLDS
  },
  Tier2: {
    tier: "Tier2",
    reachableRarities: ["Common", "Uncommon", "Rare", "Epic", "Legend"],
    thresholds: INITIAL_MEDIUM_T_THRESHOLDS
  },
  Tier3: {
    tier: "Tier3",
    reachableRarities: [
      "Common",
      "Uncommon",
      "Rare",
      "Epic",
      "Legend",
      "Mythic",
      "Phantasm"
    ],
    thresholds: INITIAL_MEDIUM_T_THRESHOLDS
  }
};

const DURATION_DF: Readonly<Record<ProductionZoneDurationClass, number>> = {
  Short: INITIAL_DURATION_RARITY_DF.short,
  Medium: INITIAL_DURATION_RARITY_DF.medium,
  Long: INITIAL_DURATION_RARITY_DF.long
};

export function getProductionZoneRarityCalibration(
  tier: ProductionZoneRarityTier
): ProductionZoneRarityCalibration {
  return INITIAL_PRODUCTION_ZONE_RARITY_CALIBRATIONS[tier];
}

export function buildProductionZoneRarityStrategy(
  tier: ProductionZoneRarityTier,
  durationClass: ProductionZoneDurationClass
): Extract<RarityResolutionStrategy, { kind: "student-t" }> {
  const calibration = getProductionZoneRarityCalibration(tier);
  return {
    kind: "student-t",
    degreesOfFreedom: DURATION_DF[durationClass],
    thresholds: calibration.thresholds,
    reachableRarities: calibration.reachableRarities
  };
}
