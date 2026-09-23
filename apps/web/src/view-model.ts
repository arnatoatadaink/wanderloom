import type {
  ActiveExplorationDto,
  ClaimResultDto,
  CoreDto,
  InventoryDto,
  ZoneDto
} from "./api-client";

export type AppPhase =
  | "booting"
  | "tutorial"
  | "ready"
  | "exploring"
  | "claimable"
  | "result"
  | "error";

export interface AppViewModel {
  readonly phase: AppPhase;
  readonly zones: readonly ZoneDto[];
  readonly selectedZoneId: string | null;
  readonly selectedDurationId: string | null;
  readonly core: CoreDto | null;
  readonly inventory: InventoryDto | null;
  readonly exploration: ActiveExplorationDto | null;
  readonly result: ClaimResultDto | null;
  readonly tutorialRemainingSeconds: number;
  readonly busy: boolean;
  readonly errorMessage: string | null;
}

export function initialViewModel(): AppViewModel {
  return {
    phase: "booting",
    zones: [],
    selectedZoneId: null,
    selectedDurationId: null,
    core: null,
    inventory: null,
    exploration: null,
    result: null,
    tutorialRemainingSeconds: 0,
    busy: false,
    errorMessage: null
  };
}

export function deriveExplorationPhase(
  exploration: ActiveExplorationDto | null,
  nowMs: number
): "ready" | "exploring" | "claimable" {
  if (exploration === null) {
    return "ready";
  }

  return nowMs < Date.parse(exploration.endsAt)
    ? "exploring"
    : "claimable";
}

export function chooseInitialSelection(
  zones: readonly ZoneDto[]
): {
  readonly zoneId: string | null;
  readonly durationId: string | null;
} {
  const zone = zones[0];
  const duration = zone?.durations[0];

  return {
    zoneId: zone?.zoneId ?? null,
    durationId: duration?.durationId ?? null
  };
}

export function remainingSeconds(
  endsAt: string,
  nowMs: number
): number {
  return Math.max(0, Math.ceil((Date.parse(endsAt) - nowMs) / 1000));
}

export const LOCAL_TUTORIAL_DURATION_MS = 10_000;

export function remainingTutorialSeconds(
  endsAtMs: number,
  nowMs: number
): number {
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
}
