import { describe, expect, it } from "vitest";

import type { ZoneDto } from "./api-client";
import {
  buildProductionZoneCardViews,
  canStartProductionZone,
  reconcileProductionZoneSelection,
  selectProductionZone
} from "./production-zone-ui";

type ProductionZoneFixture = ZoneDto & {
  readonly minimumZoneRank: number;
  readonly unlocked: boolean;
};

function zone(
  zoneId: string,
  minimumZoneRank: number,
  unlocked: boolean
): ProductionZoneFixture {
  return {
    zoneId,
    name: zoneId,
    minimumZoneRank,
    unlocked,
    durations: [
      {
        durationId: "short",
        durationMs: 30 * 60_000,
        preview: {
          gold: { min: 1, max: 2 },
          exp: { min: 1, max: 2 },
          drops: { minItems: 0, maxItems: 1 }
        }
      }
    ]
  };
}

const rank0Zones = [
  zone("wayfarer-meadow", 0, true),
  zone("mossglass-grove", 1, false),
  zone("shattered-causeway", 2, false),
  zone("ashwind-highlands", 3, false),
  zone("starfall-frontier", 4, false)
] as const;

describe("production zone UI contract", () => {
  it("marks locked cards and exposes rank requirements", () => {
    const views = buildProductionZoneCardViews({
      zones: rank0Zones,
      selectedZoneId: "wayfarer-meadow",
      selectedDurationId: "short"
    });

    expect(views).toMatchObject([
      {
        zoneId: "wayfarer-meadow",
        unlocked: true,
        requirementLabel: "Rank 0",
        selected: true
      },
      {
        zoneId: "mossglass-grove",
        unlocked: false,
        requirementLabel: "Rank 1",
        selected: false
      }
    ]);
    expect(views).toHaveLength(5);
  });

  it("ignores attempts to select a locked zone", () => {
    const state = {
      zones: rank0Zones,
      selectedZoneId: "wayfarer-meadow",
      selectedDurationId: "short"
    } as const;

    expect(selectProductionZone(state, "mossglass-grove")).toBe(state);
    expect(canStartProductionZone(state)).toBe(true);
  });

  it("accepts Mossglass after a refreshed Rank 1 catalog unlocks it", () => {
    const initial = {
      zones: rank0Zones,
      selectedZoneId: "wayfarer-meadow",
      selectedDurationId: "short"
    } as const;
    const rank1Zones = rank0Zones.map((entry) =>
      entry.zoneId === "mossglass-grove"
        ? { ...entry, unlocked: true }
        : entry
    );

    const refreshed = reconcileProductionZoneSelection(initial, rank1Zones);
    const selected = selectProductionZone(refreshed, "mossglass-grove");

    expect(selected.selectedZoneId).toBe("mossglass-grove");
    expect(selected.selectedDurationId).toBe("short");
    expect(canStartProductionZone(selected)).toBe(true);
  });
});
