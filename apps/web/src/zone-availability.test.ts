import { describe, expect, it } from "vitest";

import type { ZoneDto } from "./api-client";
import {
  isZoneUnlocked,
  zoneRequirementLabel,
  type ZoneAvailabilityDto
} from "./zone-availability";

function zone(overrides: Partial<ZoneAvailabilityDto> = {}): ZoneAvailabilityDto {
  return {
    zoneId: "zone-1",
    name: "Zone 1",
    durations: [],
    ...overrides
  };
}

describe("zone availability view helpers", () => {
  it("keeps legacy zone responses unlocked by default", () => {
    expect(isZoneUnlocked(zone())).toBe(true);
  });

  it("honors an explicit locked response", () => {
    expect(isZoneUnlocked(zone({ unlocked: false }))).toBe(false);
  });

  it("honors an explicit unlocked response", () => {
    expect(isZoneUnlocked(zone({ unlocked: true }))).toBe(true);
  });

  it("formats optional rank requirements without requiring them for legacy zones", () => {
    expect(zoneRequirementLabel(zone())).toBeNull();
    expect(zoneRequirementLabel(zone({ minimumZoneRank: 3 }))).toBe("Rank 3");
  });
});
