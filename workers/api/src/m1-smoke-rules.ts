import { createExpeditionRiskPreview, previewConfiguredRarities, type LossPolicy, type RewardPreview, type ZoneId, type ZoneRewardConfiguration } from "@wanderloom/game-core";

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

const M2_PREVIEW_REWARDS: ZoneRewardConfiguration = {
  zoneId: "m1-smoke-frontier" as ZoneId,
  drops: [
    { itemDefinitionId: "m1-wayfarer-charm" as never, rarity: "Common", weight: 8 },
    { itemDefinitionId: "m2-wayfarer-charm-rare" as never, rarity: "Rare", weight: 2 }
  ],
  durations: [{ durationId: "short", dropCount: 1 }]
};

const firstZone = M1_SMOKE_ZONES[0]!;
const firstDuration = firstZone.durations[0]!;
export const M2_SMOKE_ZONES: readonly M1ZoneDefinition[] = [{
  ...firstZone,
  durations: [{
    ...firstDuration,
    risk: createExpeditionRiskPreview(0.25, M2_PREVIEW_LOSS_POLICY),
    rarities: previewConfiguredRarities(M2_PREVIEW_REWARDS, firstDuration.durationId)
  }]
}];

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
