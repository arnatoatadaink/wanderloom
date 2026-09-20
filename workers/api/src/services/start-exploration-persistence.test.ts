import { describe, expect, it } from "vitest";

import type {
  CoreSnapshotRepository,
  PlayerCoreSnapshot,
  PlayerId,
  ZoneId,
  ExplorationId
} from "@wanderloom/game-core";
import { persistStartedExploration } from "./start-exploration-persistence";

function makePlayer(): PlayerCoreSnapshot {
  return {
    schemaVersion: 1,
    stateVersion: 2,
    playerId: "player-1" as PlayerId,
    character: { stats: { power: 8 } },
    progression: { level: 1, exp: 10, gold: 20 },
    activeExploration: null,
    updatedAt: "2026-09-20T10:00:00.000Z"
  };
}

describe("CP-07 start exploration persistence", () => {
  it("persists the started exploration with optimistic locking", async () => {
    let persisted: PlayerCoreSnapshot | null = null;
    let expectedVersion: number | null = null;

    const repository: CoreSnapshotRepository = {
      async findByPlayerId() {
        return makePlayer();
      },
      async insert() {},
      async updateIfVersionMatches(snapshot, expected) {
        persisted = snapshot;
        expectedVersion = expected;
        return true;
      }
    };

    const result = await persistStartedExploration(repository, {
      player: makePlayer(),
      zoneId: "zone-1" as ZoneId,
      durationId: "short",
      durationMs: 60_000,
      explorationId: "exploration-1" as ExplorationId,
      claimNonce: "nonce-1",
      seed: "seed-1",
      startedAt: "2026-09-20T10:01:00.000Z"
    });

    expect(result.ok).toBe(true);
    expect(expectedVersion).toBe(2);
    expect(persisted?.stateVersion).toBe(3);
    expect(persisted?.activeExploration?.explorationId).toBe("exploration-1");
  });

  it("returns version_conflict when the CAS update loses", async () => {
    const repository: CoreSnapshotRepository = {
      async findByPlayerId() {
        return makePlayer();
      },
      async insert() {},
      async updateIfVersionMatches() {
        return false;
      }
    };

    const result = await persistStartedExploration(repository, {
      player: makePlayer(),
      zoneId: "zone-1" as ZoneId,
      durationId: "short",
      durationMs: 60_000,
      explorationId: "exploration-1" as ExplorationId,
      claimNonce: "nonce-1",
      seed: "seed-1",
      startedAt: "2026-09-20T10:01:00.000Z"
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("version_conflict");
  });
});
