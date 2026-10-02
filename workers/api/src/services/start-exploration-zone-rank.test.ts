import { describe, expect, it } from "vitest";

import type {
  CoreSnapshotRepository,
  ExplorationId,
  PlayerCoreSnapshot,
  PlayerId,
  ZoneId
} from "@wanderloom/game-core";
import { persistStartedExploration } from "./start-exploration-persistence";

function makePlayer(zoneRank: number): PlayerCoreSnapshot {
  return {
    schemaVersion: 1,
    stateVersion: 4,
    playerId: "player-zone-rank" as PlayerId,
    character: { stats: { power: 10 } },
    progression: { level: 1, exp: 0, gold: 0 },
    zoneRank,
    activeExploration: null,
    updatedAt: "2026-10-02T12:00:00.000Z"
  };
}

describe("Zone Rank start persistence gate", () => {
  it("returns zone_locked without attempting a repository write", async () => {
    let updateCalls = 0;
    const repository: CoreSnapshotRepository = {
      async findByPlayerId() {
        return makePlayer(0);
      },
      async insert() {},
      async updateIfVersionMatches() {
        updateCalls += 1;
        return true;
      }
    };

    const result = await persistStartedExploration(repository, {
      player: makePlayer(0),
      zoneId: "mossglass-grove" as ZoneId,
      durationId: "short",
      durationMs: 60_000,
      explorationId: "locked-exploration" as ExplorationId,
      claimNonce: "locked-nonce",
      seed: "locked-seed",
      startedAt: "2026-10-02T12:01:00.000Z"
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("zone_locked");
    expect(updateCalls).toBe(0);
  });

  it("persists an unlocked production zone normally", async () => {
    let updateCalls = 0;
    const repository: CoreSnapshotRepository = {
      async findByPlayerId() {
        return makePlayer(1);
      },
      async insert() {},
      async updateIfVersionMatches() {
        updateCalls += 1;
        return true;
      }
    };

    const result = await persistStartedExploration(repository, {
      player: makePlayer(1),
      zoneId: "mossglass-grove" as ZoneId,
      durationId: "short",
      durationMs: 60_000,
      explorationId: "unlocked-exploration" as ExplorationId,
      claimNonce: "unlocked-nonce",
      seed: "unlocked-seed",
      startedAt: "2026-10-02T12:01:00.000Z"
    });

    expect(result.ok).toBe(true);
    expect(updateCalls).toBe(1);
  });
});
