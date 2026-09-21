import type {
  ExplorationId,
  ExplorationResolution,
  ZoneId
} from "@wanderloom/game-core";

export interface M1ZoneDefinition {
  readonly zoneId: ZoneId;
  readonly name: string;
  readonly durations: readonly {
    readonly durationId: string;
    readonly durationMs: number;
  }[];
}

export const M1_SMOKE_ZONES: readonly M1ZoneDefinition[] = [
  {
    zoneId: "m1-smoke-frontier" as ZoneId,
    name: "M1 Smoke Frontier",
    durations: [
      {
        durationId: "short",
        durationMs: 300_000
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

export function resolveM1SmokeExploration(
  _explorationId: ExplorationId
): ExplorationResolution {
  return {
    result: "success",
    gold: 5,
    exp: 10,
    drops: [],
    summaryMetrics: {}
  };
}
