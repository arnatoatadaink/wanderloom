import type { ZoneDto } from "./api-client";

export interface ZoneAvailabilityDto extends ZoneDto {
  readonly minimumZoneRank?: number;
  readonly unlocked?: boolean;
}

export function isZoneUnlocked(zone: ZoneDto): boolean {
  const availability = zone as ZoneAvailabilityDto;
  return availability.unlocked !== false;
}

export function zoneRequirementLabel(zone: ZoneDto): string | null {
  const availability = zone as ZoneAvailabilityDto;
  if (availability.minimumZoneRank === undefined) {
    return null;
  }
  return `Rank ${availability.minimumZoneRank}`;
}
