import { describe, expect, it } from "vitest";

import type {
  CoreSnapshotRepository,
  ExplorationId,
  PlayerCoreSnapshot,
  PlayerId,
  ZoneId
} from "@wanderloom/game-core";
import { resolveM2SmokeDurationMs } from "./m1-smoke-rules";
import { persistStartedExploration } from "./services/start-exploration-persistence";

function makePlayer(zoneRank: number): PlayerCoreSnapshot {
  return {
    schemaVersion: 1,
    stateVersion: 7,
    playerId: "player-production-start" as PlayerId,
    character: { stats: { power: 10 } },
    progression: { level: 1, exp: 0, gold: 0 },
    zoneRank,
    activeExploration: null,
    updatedAt: "2026-10-03T00:00:00.000Z"
  };
}

function repositoryFor(player: PlayerCoreSnapshot): {
  readonly repository: CoreSnapshotRepository;
  readonly writes: () => number;
} {
  let writeCount = 0;
  return {
    repository: {
      async findByPlayerId() {
        return player;
      },
      async insert() {},
      async updateIfVersionMatches() {
        writeCount += 1;
        return true;
      }
    },
    writes: () => writeCount
  };
}

describe("production start resolution", () => {
  it("starts an unlocked production zone with the canonical medium duration", async () => {
    const zoneId = "wayfarer-meadow" as ZoneId;
    const durationMs = resolveM2SmokeDurationMs(zoneId, "medium");
    expect(durationMs).toBe(2 * 60 * 60 * 1000);
    if (durationMs === null) return;

    const player = makePlayer(0);
    const target = repositoryFor(player);
    const result = await persistStartedExploration(target.repository, {
      player,
      zoneId,
      durationId: "medium",
      durationMs,
      explorationId: "production-medium" as ExplorationId,
      claimNonce: "production-medium-nonce",
      seed: "production-medium-seed",
      startedAt: "2026-10-03T00:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.activeExploration).toMatchObject({
      zoneId: "wayfarer-meadow",
      durationId: "medium",
      startedAt: "2026-10-03T00:00:00.000Z",
      endsAt: "2026-10-03T02:00:00.000Z"
    });
    expect(target.writes()).toBe(1);
  });

  it("keeps Zone Rank enforcement after production duration resolution", async () => {
    const zoneId = "mossglass-grove" as ZoneId;
    const durationMs = resolveM2SmokeDurationMs(zoneId, "short");
    expect(durationMs).toBe(30 * 60 * 1000);
    if (durationMs === null) return;

    const player = makePlayer(0);
    const target = repositoryFor(player);
    const result = await persistStartedExploration(target.repository, {
      player,
      zoneId,
      durationId: "short",
      durationMs,
      explorationId: "production-locked" as ExplorationId,
      claimNonce: "production-locked-nonce",
      seed: "production-locked-seed",
      startedAt: "2026-10-03T00:00:00.000Z"
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatchObject({
      code: "zone_locked",
      currentZoneRank: 0,
      requiredZoneRank: 1,
      zoneId: "mossglass-grove"
    });
    expect(target.writes()).toBe(0);
  });
});
