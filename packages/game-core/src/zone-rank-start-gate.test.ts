import { describe, expect, it } from "vitest";

import {
  startExploration,
  type ExplorationId,
  type PlayerCoreSnapshot,
  type PlayerId,
  type ZoneId
} from "./index";

const playerId = "player-zone-gate" as PlayerId;

function makePlayer(zoneRank?: number): PlayerCoreSnapshot {
  return {
    schemaVersion: 1,
    stateVersion: 1,
    playerId,
    character: { stats: { power: 10 } },
    progression: { level: 1, exp: 0, gold: 0 },
    ...(zoneRank === undefined ? {} : { zoneRank }),
    activeExploration: null,
    updatedAt: "2026-10-02T12:00:00.000Z"
  };
}

function start(player: PlayerCoreSnapshot, zoneId: string) {
  return startExploration({
    player,
    zoneId: zoneId as ZoneId,
    durationId: "short",
    durationMs: 60_000,
    explorationId: `exploration-${zoneId}` as ExplorationId,
    claimNonce: `nonce-${zoneId}`,
    seed: `seed-${zoneId}`,
    startedAt: "2026-10-02T12:01:00.000Z"
  });
}

describe("Zone Rank start gate", () => {
  it("treats a legacy snapshot without zoneRank as Rank 0 and allows the first production zone", () => {
    const result = start(makePlayer(), "wayfarer-meadow");
    expect(result.ok).toBe(true);
  });

  it("rejects a production zone above the player's current Zone Rank", () => {
    const result = start(makePlayer(0), "mossglass-grove");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      code: "zone_locked",
      zoneId: "mossglass-grove",
      currentZoneRank: 0,
      requiredZoneRank: 1
    });
  });

  it("allows an unlocked production zone", () => {
    const result = start(makePlayer(2), "shattered-causeway");
    expect(result.ok).toBe(true);
  });

  it("preserves legacy and non-production Zone compatibility", () => {
    const result = start(makePlayer(0), "zone-1");
    expect(result.ok).toBe(true);
  });
});
