import type { ZoneDto } from "./api-client";
import { isZoneUnlocked, zoneRequirementLabel } from "./zone-availability";

export interface ProductionZoneUiState {
  readonly zones: readonly ZoneDto[];
  readonly selectedZoneId: string | null;
  readonly selectedDurationId: string | null;
}

export interface ProductionZoneCardView {
  readonly zoneId: string;
  readonly name: string;
  readonly unlocked: boolean;
  readonly requirementLabel: string | null;
  readonly selected: boolean;
}

export function buildProductionZoneCardViews(
  state: ProductionZoneUiState
): readonly ProductionZoneCardView[] {
  return state.zones.map((zone) => ({
    zoneId: zone.zoneId,
    name: zone.name,
    unlocked: isZoneUnlocked(zone),
    requirementLabel: zoneRequirementLabel(zone),
    selected: zone.zoneId === state.selectedZoneId
  }));
}

export function selectProductionZone(
  state: ProductionZoneUiState,
  requestedZoneId: string
): ProductionZoneUiState {
  const zone = state.zones.find((entry) => entry.zoneId === requestedZoneId);
  if (zone === undefined || !isZoneUnlocked(zone)) {
    return state;
  }

  return {
    ...state,
    selectedZoneId: zone.zoneId,
    selectedDurationId: zone.durations[0]?.durationId ?? null
  };
}

export function reconcileProductionZoneSelection(
  state: ProductionZoneUiState,
  zones: readonly ZoneDto[]
): ProductionZoneUiState {
  const selected = zones.find((zone) => zone.zoneId === state.selectedZoneId);
  if (selected !== undefined && isZoneUnlocked(selected)) {
    return {
      ...state,
      zones,
      selectedDurationId:
        selected.durations.some(
          (duration) => duration.durationId === state.selectedDurationId
        )
          ? state.selectedDurationId
          : selected.durations[0]?.durationId ?? null
    };
  }

  const fallback = zones.find(isZoneUnlocked);
  return {
    ...state,
    zones,
    selectedZoneId: fallback?.zoneId ?? null,
    selectedDurationId: fallback?.durations[0]?.durationId ?? null
  };
}

export function canStartProductionZone(
  state: ProductionZoneUiState
): boolean {
  if (state.selectedZoneId === null || state.selectedDurationId === null) {
    return false;
  }

  const zone = state.zones.find(
    (entry) => entry.zoneId === state.selectedZoneId
  );
  return (
    zone !== undefined &&
    isZoneUnlocked(zone) &&
    zone.durations.some(
      (duration) => duration.durationId === state.selectedDurationId
    )
  );
}
