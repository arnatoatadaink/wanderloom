import {
  createExpeditionRiskPreview,
  previewConfiguredRarities,
  type EquipmentEffectDefinition,
  type ItemDefinitionId,
  type LossPolicy,
  type ProgressionRule,
  type RewardPreview,
  type ZoneId,
  type ZoneRewardConfiguration
} from "@wanderloom/game-core";

export interface M1ZoneDefinition {
  readonly zoneId: ZoneId;
  readonly name: string;
  readonly durations: readonly {
    readonly durationId: string;
    readonly durationMs: number;
    readonly preview: RewardPreview;
    readonly risk?: ReturnType<typeof createExpeditionRiskPreview>;
    readonly rarities?: readonly string[];
  }[];
}

export const M1_SMOKE_ZONES: readonly M1ZoneDefinition[] = [
  {
    zoneId: "m1-smoke-frontier" as ZoneId,
    name: "M1 Smoke Frontier",
    durations: [
      {
        durationId: "short",
        durationMs: 300_000,
        preview: {
          gold: { min: 5, max: 6 },
          exp: { min: 10, max: 10 },
          drops: { minItems: 1, maxItems: 1 }
        }
      }
    ]
  }
];

export const M2_PREVIEW_LOSS_POLICY: LossPolicy = {
  retainedGoldRatio: 0.5,
  retainedExpRatio: 0.5,
  retainGeneratedDrops: false
};

export const M2_SMOKE_REWARD_CONFIGURATIONS: readonly ZoneRewardConfiguration[] = [
  {
    zoneId: "m1-smoke-frontier" as ZoneId,
    drops: [
      { itemDefinitionId: "m1-wayfarer-charm" as ItemDefinitionId, rarity: "Common", weight: 8 },
      { itemDefinitionId: "m2-wayfarer-charm-rare" as ItemDefinitionId, rarity: "Rare", weight: 2 }
    ],
    durations: [
      { durationId: "short", dropCount: 1 },
      { durationId: "long", dropCount: 2, rarityWeightMultipliers: { Rare: 1.5 } }
    ]
  },
  {
    zoneId: "m2-moss-hollow" as ZoneId,
    drops: [
      { itemDefinitionId: "m2-moss-charm" as ItemDefinitionId, rarity: "Uncommon", weight: 7 },
      { itemDefinitionId: "m2-moss-charm-epic" as ItemDefinitionId, rarity: "Epic", weight: 1 }
    ],
    durations: [
      { durationId: "short", dropCount: 1 },
      { durationId: "long", dropCount: 2, rarityWeightMultipliers: { Epic: 2 } }
    ]
  }
];

export const M2_SMOKE_REWARD_CONFIGURATION =
  M2_SMOKE_REWARD_CONFIGURATIONS[0]!;

export const M2_SMOKE_EQUIPMENT_EFFECT_DEFINITIONS: readonly EquipmentEffectDefinition[] = [
  {
    itemDefinitionId: "m1-wayfarer-charm" as ItemDefinitionId,
    statModifiers: { power: 1 }
  },
  {
    itemDefinitionId: "m2-wayfarer-charm-rare" as ItemDefinitionId,
    statModifiers: { power: 2, luck: 1 }
  },
  {
    itemDefinitionId: "m2-moss-charm" as ItemDefinitionId,
    statModifiers: { luck: 1 }
  },
  {
    itemDefinitionId: "m2-moss-charm-epic" as ItemDefinitionId,
    statModifiers: { power: 2, luck: 2 }
  }
];

function zoneDefinition(
  zoneId: ZoneId,
  name: string,
  durations: readonly {
    readonly durationId: string;
    readonly durationMs: number;
    readonly preview: RewardPreview;
  }[]
): M1ZoneDefinition {
  const configuration = resolveM2SmokeRewardConfiguration(zoneId);
  if (configuration === null) {
    throw new Error("missing M2 smoke reward configuration");
  }

  return {
    zoneId,
    name,
    durations: durations.map((duration) => ({
      ...duration,
      risk: createExpeditionRiskPreview(0.25, M2_PREVIEW_LOSS_POLICY),
      rarities: previewConfiguredRarities(configuration, duration.durationId)
    }))
  };
}

export const M2_SMOKE_ZONES: readonly M1ZoneDefinition[] = [
  zoneDefinition(
    "m1-smoke-frontier" as ZoneId,
    "M1 Smoke Frontier",
    [
      {
        durationId: "short",
        durationMs: 300_000,
        preview: {
          gold: { min: 5, max: 6 },
          exp: { min: 10, max: 10 },
          drops: { minItems: 1, maxItems: 1 }
        }
      },
      {
        durationId: "long",
        durationMs: 600_000,
        preview: {
          gold: { min: 5, max: 6 },
          exp: { min: 10, max: 10 },
          drops: { minItems: 2, maxItems: 2 }
        }
      }
    ]
  ),
  zoneDefinition(
    "m2-moss-hollow" as ZoneId,
    "Moss Hollow",
    [
      {
        durationId: "short",
        durationMs: 300_000,
        preview: {
          gold: { min: 5, max: 6 },
          exp: { min: 10, max: 10 },
          drops: { minItems: 1, maxItems: 1 }
        }
      },
      {
        durationId: "long",
        durationMs: 600_000,
        preview: {
          gold: { min: 5, max: 6 },
          exp: { min: 10, max: 10 },
          drops: { minItems: 2, maxItems: 2 }
        }
      }
    ]
  )
];

export const M2_SMOKE_PROGRESSION_RULE: ProgressionRule = {
  maxLevel: 20,
  expRequiredForLevel: (level) => 100 + (level - 1) * 25
};

export const M1_SMOKE_RECENT_ARCHIVE_RETENTION = 3;

export function resolveM1SmokeDurationMs(
  zoneId: ZoneId,
  durationId: string
): number | null {
  const zone = M1_SMOKE_ZONES.find((entry) => entry.zoneId === zoneId);
  const duration = zone?.durations.find(
    (entry) => entry.durationId === durationId
  );

  return duration?.durationMs ?? null;
}

export function resolveM2SmokeDurationMs(
  zoneId: ZoneId,
  durationId: string
): number | null {
  const zone = M2_SMOKE_ZONES.find((entry) => entry.zoneId === zoneId);
  const duration = zone?.durations.find(
    (entry) => entry.durationId === durationId
  );

  return duration?.durationMs ?? null;
}

export function resolveM2SmokeRewardConfiguration(
  zoneId: ZoneId
): ZoneRewardConfiguration | null {
  return M2_SMOKE_REWARD_CONFIGURATIONS.find(
    (entry) => entry.zoneId === zoneId
  ) ?? null;
}
