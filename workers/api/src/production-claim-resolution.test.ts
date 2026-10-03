import { describe, expect, it } from "vitest";

import type {
  ActiveExploration,
  ExplorationId,
  ItemInstanceId,
  ZoneId
} from "@wanderloom/game-core";
import { buildProductionZonePreview } from "./production-zone-preview";
import { resolveProductionClaim } from "./production-claim-resolution";

function exploration(
  zoneId: string,
  durationId: string,
  seed: string
): ActiveExploration {
  return {
    explorationId: `exploration-${zoneId}-${durationId}` as ExplorationId,
    zoneId: zoneId as ZoneId,
    durationId,
    startedAt: "2026-10-03T00:00:00.000Z",
    endsAt: "2026-10-03T08:00:00.000Z",
    seed,
    claimNonce: `nonce-${zoneId}-${durationId}`,
    characterSnapshot: { stats: { power: 10 } }
  };
}

function findSeedForResult(result: "success" | "failure"): string {
  for (let index = 0; index < 10_000; index += 1) {
    const seed = `production-${result}-${index}`;
    const resolved = resolveProductionClaim(
      exploration("starfall-frontier", "long", seed)
    );
    if (resolved?.result === result) return seed;
  }
  throw new Error(`unable to find deterministic ${result} seed`);
}

describe("production claim resolution", () => {
  it("resolves production Gold and EXP within the published preview bounds", () => {
    const preview = buildProductionZonePreview(0)[0]!;
    const duration = preview.durations.find((entry) => entry.durationId === "short")!;
    const resolved = resolveProductionClaim(
      exploration("wayfarer-meadow", "short", "production-wayfarer-short")
    );

    expect(resolved).not.toBeNull();
    expect(resolved!.gold).toBeGreaterThanOrEqual(duration.preview.gold.min);
    expect(resolved!.gold).toBeLessThanOrEqual(duration.preview.gold.max);
    expect(resolved!.exp).toBeGreaterThanOrEqual(duration.preview.exp.min);
    expect(resolved!.exp).toBeLessThanOrEqual(duration.preview.exp.max);
    expect(resolved!.drops).toEqual([]);
    expect(resolved!.summaryMetrics.failureProbability).toBe(
      duration.risk.failureProbability
    );
  });

  it("is deterministic for identical production exploration inputs", () => {
    const input = exploration(
      "starfall-frontier",
      "long",
      "production-repeatable"
    );
    expect(resolveProductionClaim(input)).toEqual(resolveProductionClaim(input));
  });

  it("uses the duration-specific production EXP table", () => {
    const short = resolveProductionClaim(
      exploration("wayfarer-meadow", "short", "same-seed")
    );
    const long = resolveProductionClaim(
      exploration("wayfarer-meadow", "long", "same-seed")
    );

    expect(short).not.toBeNull();
    expect(long).not.toBeNull();
    expect(long!.summaryMetrics.generatedExp).toBe(80);
    expect(short!.summaryMetrics.generatedExp).toBe(8);
  });

  it("instantiates the retained production drop on success", () => {
    const claimedAt = "2026-10-03T09:00:00.000Z";
    const seed = findSeedForResult("success");
    const resolved = resolveProductionClaim(
      exploration("starfall-frontier", "long", seed),
      claimedAt,
      () => "production-item-1" as ItemInstanceId
    );

    expect(resolved?.result).toBe("success");
    expect(resolved?.summaryMetrics.generatedDropCount).toBe(1);
    expect(resolved?.summaryMetrics.retainedDropCount).toBe(1);
    expect(resolved?.drops).toHaveLength(1);
    expect(resolved?.drops[0]).toMatchObject({
      itemInstanceId: "production-item-1",
      createdAt: claimedAt
    });
    expect(resolved?.drops[0]?.itemDefinitionId).toMatch(/^production-/);
    expect(resolved?.drops[0]?.rarity).toBeTruthy();
  });

  it("drops the generated production item on failure", () => {
    let instanceIdsCreated = 0;
    const seed = findSeedForResult("failure");
    const resolved = resolveProductionClaim(
      exploration("starfall-frontier", "long", seed),
      "2026-10-03T09:00:00.000Z",
      () => {
        instanceIdsCreated += 1;
        return `production-item-${instanceIdsCreated}` as ItemInstanceId;
      }
    );

    expect(resolved?.result).toBe("failure");
    expect(resolved?.summaryMetrics.generatedDropCount).toBe(1);
    expect(resolved?.summaryMetrics.retainedDropCount).toBe(0);
    expect(resolved?.drops).toEqual([]);
    expect(instanceIdsCreated).toBe(0);
  });

  it("returns null for non-production zones so smoke runtime can fall back", () => {
    expect(
      resolveProductionClaim(
        exploration("m1-smoke-frontier", "short", "smoke-fallback")
      )
    ).toBeNull();
  });
});
