import { describe, expect, it } from "vitest";
import type { ZoneId } from "@wanderloom/game-core";
import {
  buildProductionZoneCatalog,
  PRODUCTION_DURATION_CATALOG,
  resolveProductionDuration
} from "./production-zone-catalog";

describe("production zone runtime catalog", () => {
  it("defines the canonical short, medium and long durations", () => {
    expect(PRODUCTION_DURATION_CATALOG).toEqual([
      { durationId: "short", durationClass: "Short", durationMs: 1_800_000 },
      { durationId: "medium", durationClass: "Medium", durationMs: 7_200_000 },
      { durationId: "long", durationClass: "Long", durationMs: 28_800_000 }
    ]);
  });

  it("returns all five production zones in stable progression order", () => {
    expect(buildProductionZoneCatalog(0).map((zone) => zone.zoneId)).toEqual([
      "wayfarer-meadow",
      "mossglass-grove",
      "shattered-causeway",
      "ashwind-highlands",
      "starfall-frontier"
    ]);
  });

  it("unlocks only Wayfarer Meadow at Rank 0", () => {
    const catalog = buildProductionZoneCatalog(0);
    expect(catalog.filter((zone) => zone.unlocked).map((zone) => zone.zoneId)).toEqual([
      "wayfarer-meadow"
    ]);
  });

  it("unlocks through Shattered Causeway at Rank 2", () => {
    const catalog = buildProductionZoneCatalog(2);
    expect(catalog.filter((zone) => zone.unlocked).map((zone) => zone.zoneId)).toEqual([
      "wayfarer-meadow",
      "mossglass-grove",
      "shattered-causeway"
    ]);
  });

  it("attaches all canonical durations to every production zone", () => {
    for (const zone of buildProductionZoneCatalog(4)) {
      expect(zone.durations).toBe(PRODUCTION_DURATION_CATALOG);
    }
  });

  it("resolves production durations only for production zone IDs", () => {
    expect(
      resolveProductionDuration("mossglass-grove" as ZoneId, "medium")
    ).toEqual({
      durationId: "medium",
      durationClass: "Medium",
      durationMs: 7_200_000
    });
    expect(
      resolveProductionDuration("m1-smoke-frontier" as ZoneId, "short")
    ).toBeNull();
    expect(
      resolveProductionDuration("wayfarer-meadow" as ZoneId, "unknown")
    ).toBeNull();
  });

  it("rejects invalid zone ranks", () => {
    expect(() => buildProductionZoneCatalog(-1)).toThrow(RangeError);
    expect(() => buildProductionZoneCatalog(1.5)).toThrow(RangeError);
  });
});
