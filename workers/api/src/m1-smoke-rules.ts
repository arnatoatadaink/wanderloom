import type {
  RewardPreview,
  ZoneId
} from "@wanderloom/game-core";

export interface M1ZoneDefinition {
  readonly zoneId: ZoneId;
  readonly name: string;
  readonly durations: readonly {
    readonly durationId: string;
    readonly durationMs: number;
    readonly preview: RewardPreview;
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

