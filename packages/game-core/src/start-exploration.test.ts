import { describe, expect, it } from "vitest";

import {
  startExploration,
  type ExplorationId,
  type PlayerCoreSnapshot,
  type PlayerId,
  type ZoneId
} from "./index";

describe("E-002 start exploration", () => {
  const playerId = "player-1" as PlayerId;

  const player: PlayerCoreSnapshot = {
    schemaVersion: 1,
    stateVersion: 7,
    playerId,
    character: { stats: { power: 12 } },
    progression: { level: 3, exp: 180, gold: 55 },
    activeExploration: null,
    updatedAt: "2026-09-20T10:00:00.000Z"
  };

  it("creates an active exploration and increments state version", () => {
    const result = startExploration({
      player,
      zoneId: "zone-1" as ZoneId,
      durationId: "short",
      durationMs: 5 * 60 * 1000,
      explorationId: "exploration-1" as ExplorationId,
      claimNonce: "nonce-1",
      seed: "seed-1",
      startedAt: "2026-09-20T10:01:00.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.previousStateVersion).toBe(7);
    expect(result.value.nextCore.stateVersion).toBe(8);
    expect(result.value.exploration.endsAt).toBe(
      "2026-09-20T10:06:00.000Z"
    );
    expect(result.value.exploration.characterSnapshot).toEqual(player.character);
    expect(result.value.nextCore.activeExploration).toEqual(
      result.value.exploration
    );
  });

  it("rejects start when another exploration is active", () => {
    const activePlayer: PlayerCoreSnapshot = {
      ...player,
      activeExploration: {
        explorationId: "exploration-existing" as ExplorationId,
        zoneId: "zone-1" as ZoneId,
        durationId: "short",
        startedAt: "2026-09-20T10:00:00.000Z",
        endsAt: "2026-09-20T10:05:00.000Z",
        seed: "seed-existing",
        claimNonce: "nonce-existing",
        characterSnapshot: player.character
      }
    };

    const result = startExploration({
      player: activePlayer,
      zoneId: "zone-2" as ZoneId,
      durationId: "short",
      durationMs: 5 * 60 * 1000,
      explorationId: "exploration-2" as ExplorationId,
      claimNonce: "nonce-2",
      seed: "seed-2",
      startedAt: "2026-09-20T10:01:00.000Z"
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe("invalid_exploration_state");
    expect(result.error.actualState).toBe("exploring");
  });
});
