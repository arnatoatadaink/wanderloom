import { describe, expect, it } from "vitest";
import type { ActiveExploration, ExplorationId, ZoneId } from "@wanderloom/game-core";
import { resolveProductionGeneratedDrops } from "./production-rarity-drop";

function exploration(zoneId: string, durationId: string, seed: string): ActiveExploration {
  return {
    explorationId: "production-rarity-test" as ExplorationId,
    zoneId: zoneId as ZoneId,
    durationId,
    startedAt: "2026-10-03T00:00:00.000Z",
    endsAt: "2026-10-03T00:30:00.000Z",
    seed,
    claimNonce: "nonce",
    characterSnapshot: { stats: {} }
  };
}

describe("production rarity drop generator", () => {
  it("is deterministic for identical production inputs", () => {
    const input = exploration("wayfarer-meadow", "short", "same-seed");
    expect(resolveProductionGeneratedDrops(input)).toEqual(
      resolveProductionGeneratedDrops(input)
    );
  });

  it("keeps Tier1 zones within Common, Uncommon, and Rare", () => {
    const allowed = new Set(["Common", "Uncommon", "Rare"]);
    for (let index = 0; index < 64; index += 1) {
      const drops = resolveProductionGeneratedDrops(
        exploration("wayfarer-meadow", "long", `tier1-${index}`)
      );
      expect(drops).toHaveLength(1);
      expect(allowed.has(drops![0]!.rarity)).toBe(true);
    }
  });

  it("keeps Tier2 zones below Mythic and Phantasm", () => {
    const disallowed = new Set(["Mythic", "Phantasm"]);
    for (let index = 0; index < 64; index += 1) {
      const drops = resolveProductionGeneratedDrops(
        exploration("shattered-causeway", "long", `tier2-${index}`)
      );
      expect(drops).toHaveLength(1);
      expect(disallowed.has(drops![0]!.rarity)).toBe(false);
    }
  });

  it("returns one typed production relic for a Tier3 zone", () => {
    const drops = resolveProductionGeneratedDrops(
      exploration("starfall-frontier", "long", "tier3-seed")
    );
    expect(drops).toHaveLength(1);
    expect(drops![0]!.itemDefinitionId).toMatch(/^production-.+-relic$/);
    expect(drops![0]!.rarity).toBeTruthy();
  });

  it("returns null for smoke or unknown zone-duration pairs", () => {
    expect(
      resolveProductionGeneratedDrops(
        exploration("m1-smoke-frontier", "short", "smoke")
      )
    ).toBeNull();
    expect(
      resolveProductionGeneratedDrops(
        exploration("wayfarer-meadow", "unknown", "unknown-duration")
      )
    ).toBeNull();
  });
});
