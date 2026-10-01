import {
  calculateFormationEconomy,
  INITIAL_FORMATION_ECONOMY_PARAMETERS,
  type DurationClass,
  type FormationClass,
  type FormationEconomyMetrics,
  type FormationEconomyParameters
} from "./formation-economy-model";
import {
  buildDurationRarityDistribution,
  calculateRarityOpportunityMetrics,
  type RarityOpportunityMetrics
} from "./duration-rarity-model";
import {
  INITIAL_PRODUCTION_ZONE_CONTENT_MAP,
  type ProductionZoneContentDefinition
} from "./production-zone-content-map";
import {
  buildProductionZoneRarityStrategy,
  getProductionZoneRarityCalibration
} from "./production-zone-rarity-calibration";
import { calculateZoneRiskOperationalCostMultiplier } from "./zone-risk-operational-cost";

export interface ProductionContentBalanceRow {
  readonly zone: ProductionZoneContentDefinition;
  readonly durationClass: DurationClass;
  readonly formationClass: FormationClass;
  readonly participantCount: number;
  readonly zoneRewardScale: number;
  readonly zoneRiskOperationalCostMultiplier: number;
  readonly economy: FormationEconomyMetrics;
  readonly rarity: RarityOpportunityMetrics;
}

export interface ProductionContentBalanceDiagnostic {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly durationClass: DurationClass;
  readonly soloNetPerParticipant: number;
  readonly bestGroupNetPerParticipant: number;
  readonly soloRelativeToBestGroup: number;
  readonly soloMeetsNinetyPercent: boolean;
}

export interface ProductionContentBalanceMatrixReport {
  readonly rows: readonly ProductionContentBalanceRow[];
  readonly soloDiagnostics: readonly ProductionContentBalanceDiagnostic[];
  readonly allNetRewardsNonNegative: boolean;
  readonly allFormationTotalOutputOrdered: boolean;
}

const FORMATIONS: readonly FormationClass[] = ["Solo", "Party", "Caravan"];
const DURATIONS: readonly DurationClass[] = ["Short", "Medium", "Long"];

const DEFAULT_PARTICIPANTS: Readonly<Record<FormationClass, number>> = {
  Solo: 1,
  Party: 2,
  Caravan: 5
};

function scaleEconomyParameters(
  zoneRewardScale: number,
  zone: ProductionZoneContentDefinition
): FormationEconomyParameters {
  const base = INITIAL_FORMATION_ECONOMY_PARAMETERS;
  return {
    ...base,
    baseOperationalCost: {
      Solo:
        base.baseOperationalCost.Solo * calculateZoneRiskOperationalCostMultiplier({
          formationClass: "Solo",
          riskIndex: zone.riskIndex,
          zoneRewardScale
        }),
      Party:
        base.baseOperationalCost.Party * calculateZoneRiskOperationalCostMultiplier({
          formationClass: "Party",
          riskIndex: zone.riskIndex,
          zoneRewardScale
        }),
      Caravan:
        base.baseOperationalCost.Caravan * calculateZoneRiskOperationalCostMultiplier({
          formationClass: "Caravan",
          riskIndex: zone.riskIndex,
          zoneRewardScale
        })
    },
    grossReward: {
      Solo: {
        Short: base.grossReward.Solo.Short * zoneRewardScale,
        Medium: base.grossReward.Solo.Medium * zoneRewardScale,
        Long: base.grossReward.Solo.Long * zoneRewardScale
      },
      Party: {
        Short: base.grossReward.Party.Short * zoneRewardScale,
        Medium: base.grossReward.Party.Medium * zoneRewardScale,
        Long: base.grossReward.Party.Long * zoneRewardScale
      },
      Caravan: {
        Short: base.grossReward.Caravan.Short * zoneRewardScale,
        Medium: base.grossReward.Caravan.Medium * zoneRewardScale,
        Long: base.grossReward.Caravan.Long * zoneRewardScale
      }
    }
  };
}

export function buildProductionContentBalanceMatrix(input: {
  readonly zones?: readonly ProductionZoneContentDefinition[];
  readonly participantCounts?: Partial<Record<FormationClass, number>>;
} = {}): ProductionContentBalanceMatrixReport {
  const zones = input.zones ?? INITIAL_PRODUCTION_ZONE_CONTENT_MAP;
  if (zones.length === 0) throw new RangeError("at least one zone is required");

  const rows: ProductionContentBalanceRow[] = [];

  for (const zone of zones) {
    const zoneRewardScale = zone.baseRewardGold / INITIAL_PRODUCTION_ZONE_CONTENT_MAP[0]!.baseRewardGold;
    const parameters = scaleEconomyParameters(zoneRewardScale, zone);
    const rarityCalibration = getProductionZoneRarityCalibration(zone.rarityTier);

    for (const durationClass of DURATIONS) {
      const rarityStrategy = buildProductionZoneRarityStrategy(zone.rarityTier, durationClass);
      const probabilityByRarity = buildDurationRarityDistribution({
        degreesOfFreedom: rarityStrategy.degreesOfFreedom,
        thresholds: rarityCalibration.thresholds,
        reachableRarities: rarityCalibration.reachableRarities
      });
      const rarity = calculateRarityOpportunityMetrics(probabilityByRarity);

      for (const formationClass of FORMATIONS) {
        const participantCount = input.participantCounts?.[formationClass]
          ?? DEFAULT_PARTICIPANTS[formationClass];
        const zoneRiskOperationalCostMultiplier = calculateZoneRiskOperationalCostMultiplier({
          formationClass,
          riskIndex: zone.riskIndex,
          zoneRewardScale
        });
        const economy = calculateFormationEconomy({
          formationClass,
          participantCount,
          durationClass,
          travelCost: zone.travelCostGold,
          parameters
        });

        rows.push({
          zone,
          durationClass,
          formationClass,
          participantCount,
          zoneRewardScale,
          zoneRiskOperationalCostMultiplier,
          economy,
          rarity
        });
      }
    }
  }

  const soloDiagnostics: ProductionContentBalanceDiagnostic[] = [];
  for (const zone of zones) {
    for (const durationClass of DURATIONS) {
      const scenario = rows.filter(
        (row) => row.zone.zoneId === zone.zoneId && row.durationClass === durationClass
      );
      const solo = scenario.find((row) => row.formationClass === "Solo")!;
      const bestGroup = Math.max(
        ...scenario
          .filter((row) => row.formationClass !== "Solo")
          .map((row) => row.economy.netRewardPerParticipant)
      );
      const relative = bestGroup === 0 ? 1 : solo.economy.netRewardPerParticipant / bestGroup;
      soloDiagnostics.push({
        zoneId: zone.zoneId,
        zoneName: zone.displayName,
        durationClass,
        soloNetPerParticipant: solo.economy.netRewardPerParticipant,
        bestGroupNetPerParticipant: bestGroup,
        soloRelativeToBestGroup: relative,
        soloMeetsNinetyPercent: relative >= 0.9
      });
    }
  }

  const allNetRewardsNonNegative = rows.every((row) => row.economy.netReward >= 0);
  const allFormationTotalOutputOrdered = zones.every((zone) =>
    DURATIONS.every((durationClass) => {
      const scenario = rows.filter(
        (row) => row.zone.zoneId === zone.zoneId && row.durationClass === durationClass
      );
      const solo = scenario.find((row) => row.formationClass === "Solo")!.economy.netReward;
      const party = scenario.find((row) => row.formationClass === "Party")!.economy.netReward;
      const caravan = scenario.find((row) => row.formationClass === "Caravan")!.economy.netReward;
      return solo < party && party < caravan;
    })
  );

  return {
    rows,
    soloDiagnostics,
    allNetRewardsNonNegative,
    allFormationTotalOutputOrdered
  };
}
