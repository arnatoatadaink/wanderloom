import { describe, expect, it } from "vitest";

import type { PlayerCoreSnapshot, PlayerId } from "@wanderloom/game-core";
import { buildProductionZoneApiResponse } from "./production-zone-api-response";

function core(zoneRank?: number): PlayerCoreSnapshot {
  return {
    schemaVersion: 1,
    stateVersion: 0,
    playerId: "player-zone-api" as PlayerId,
    character: { stats: { power: 10 } },
    progression: { level: 1, exp: 0, gold: 0 },
    ...(zoneRank === undefined ? {} : { zoneRank }),
    activeExploration: null,
    updatedAt: "2026-10-03T00:00:00.000Z"
  };
}

describe("production zone API response", () => {
  it("treats legacy snapshots without zoneRank as Rank 0", () => {
    const response = buildProductionZoneApiResponse(core());

    expect(response.ok).toBe(true);
    expect(response.zones).toHaveLength(5);
    expect(response.zones.map((zone) => [zone.zoneId, zone.unlocked])).toEqual([
      ["wayfarer-meadow", true],
      ["mossglass-grove", false],
      ["shattered-causeway", false],
      ["ashwind-highlands", false],
      ["starfall-frontier", false]
    ]);
  });

  it("unlocks Mossglass at Rank 1 without changing later-zone gates", () => {
    const response = buildProductionZoneApiResponse(core(1));

    expect(response.zones.map((zone) => [zone.zoneId, zone.minimumZoneRank, zone.unlocked])).toEqual([
      ["wayfarer-meadow", 0, true],
      ["mossglass-grove", 1, true],
      ["shattered-causeway", 2, false],
      ["ashwind-highlands", 3, false],
      ["starfall-frontier", 4, false]
    ]);
  });

  it("publishes production preview fields required by the existing Web DTO", () => {
    const wayfarer = buildProductionZoneApiResponse(core()).zones[0]!;
    const short = wayfarer.durations.find((duration) => duration.durationId === "short")!;

    expect(wayfarer.name).toBe("Wayfarer Meadow");
    expect(short.durationMs).toBe(30 * 60 * 1000);
    expect(short.preview.gold.max).toBeGreaterThanOrEqual(short.preview.gold.min);
    expect(short.preview.exp.max).toBeGreaterThanOrEqual(short.preview.exp.min);
    expect(short.preview.drops).toEqual({ minItems: 0, maxItems: 1 });
    expect(short.risk.failureProbability).toBeGreaterThan(0);
    expect(short.rarities).toEqual(["Common", "Uncommon", "Rare"]);
  });
});
