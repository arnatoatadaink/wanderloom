import type { ItemDefinitionId, ZoneId } from "./ids";
import { INITIAL_DURATION_RARITY_DF } from "./duration-rarity-model";
import {
  ITEM_RARITIES,
  type ItemRarity,
  type ZoneRewardConfiguration
} from "./rarity-zone-rewards";
import {
  compareRarityResolutionStrategies,
  type RarityShadowComparisonReport
} from "./rarity-shadow-comparison";

export type RepresentativeZoneProfile = "Starter" | "Standard" | "Full";
export type RepresentativeDurationClass = "Short" | "Medium" | "Long";

export interface RepresentativeZoneShadowRow {
  readonly profile: RepresentativeZoneProfile;
  readonly durationClass: RepresentativeDurationClass;
  readonly durationId: string;
  readonly degreesOfFreedom: number;
  readonly reachableRarities: readonly ItemRarity[];
  readonly report: RarityShadowComparisonReport;
}

export interface RepresentativeZoneShadowReport {
  readonly iterationsPerScenario: number;
  readonly rows: readonly RepresentativeZoneShadowRow[];
}

const PROFILE_RARITIES: Readonly<Record<RepresentativeZoneProfile, readonly ItemRarity[]>> = {
  Starter: ["Common", "Uncommon", "Rare"],
  Standard: ["Common", "Uncommon", "Rare", "Epic", "Legend"],
  Full: ITEM_RARITIES
};

const DURATION_DF: Readonly<Record<RepresentativeDurationClass, number>> = {
  Short: INITIAL_DURATION_RARITY_DF.short,
  Medium: INITIAL_DURATION_RARITY_DF.medium,
  Long: INITIAL_DURATION_RARITY_DF.long
};

const DURATION_ID: Readonly<Record<RepresentativeDurationClass, string>> = {
  Short: "short",
  Medium: "medium",
  Long: "long"
};

const DURATION_DROP_COUNT: Readonly<Record<RepresentativeDurationClass, number>> = {
  Short: 1,
  Medium: 2,
  Long: 3
};

function profileZoneId(profile: RepresentativeZoneProfile): ZoneId {
  return `shadow-${profile.toLowerCase()}` as ZoneId;
}

function profileWeight(rarity: ItemRarity): number {
  const referenceProbability: Readonly<Record<ItemRarity, number>> = {
    Common: 0.55,
    Uncommon: 0.25,
    Rare: 0.12,
    Epic: 0.05,
    Legend: 0.02,
    Mythic: 0.008,
    Phantasm: 0.002
  };
  return referenceProbability[rarity];
}

export function buildRepresentativeZoneConfiguration(
  profile: RepresentativeZoneProfile
): ZoneRewardConfiguration {
  const reachable = PROFILE_RARITIES[profile];
  return {
    zoneId: profileZoneId(profile),
    durations: (["Short", "Medium", "Long"] as const).map((durationClass) => ({
      durationId: DURATION_ID[durationClass],
      dropCount: DURATION_DROP_COUNT[durationClass]
    })),
    drops: reachable.map((rarity, index) => ({
      itemDefinitionId: `${profile.toLowerCase()}-${rarity.toLowerCase()}-${index}` as ItemDefinitionId,
      rarity,
      weight: profileWeight(rarity)
    }))
  };
}

export function buildRepresentativeZoneShadowReport(input: {
  readonly iterationsPerScenario?: number;
  readonly seedPrefix?: string;
} = {}): RepresentativeZoneShadowReport {
  const iterationsPerScenario = input.iterationsPerScenario ?? 10_000;
  const seedPrefix = input.seedPrefix ?? "representative-zone-shadow";
  if (!Number.isSafeInteger(iterationsPerScenario) || iterationsPerScenario <= 0) {
    throw new RangeError("iterationsPerScenario must be a positive safe integer");
  }

  const profiles = ["Starter", "Standard", "Full"] as const;
  const durations = ["Short", "Medium", "Long"] as const;
  const rows = profiles.flatMap((profile) => {
    const configuration = buildRepresentativeZoneConfiguration(profile);
    const reachableRarities = PROFILE_RARITIES[profile];
    return durations.map((durationClass): RepresentativeZoneShadowRow => {
      const degreesOfFreedom = DURATION_DF[durationClass];
      const durationId = DURATION_ID[durationClass];
      return {
        profile,
        durationClass,
        durationId,
        degreesOfFreedom,
        reachableRarities,
        report: compareRarityResolutionStrategies({
          seedPrefix: `${seedPrefix}:${profile}:${durationClass}`,
          iterations: iterationsPerScenario,
          zoneId: configuration.zoneId,
          durationId,
          configuration,
          candidateStrategy: {
            kind: "student-t",
            degreesOfFreedom,
            reachableRarities
          }
        })
      };
    });
  });

  return { iterationsPerScenario, rows };
}
