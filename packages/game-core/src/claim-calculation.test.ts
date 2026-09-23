import { describe, expect, it } from "vitest";

import {
  calculateClaim,
  type ExplorationId,
  type ItemDefinitionId,
  type ItemInstanceId,
  type PlayerCoreSnapshot,
  type PlayerId,
  type PlayerInventorySnapshot,
  type ZoneId
} from "./index";

describe("CP-08 claim calculation", () => {
  const playerId = "player-1" as PlayerId;
  const explorationId = "exploration-1" as ExplorationId;
  const zoneId = "zone-1" as ZoneId;

  const core: PlayerCoreSnapshot = {
    schemaVersion: 1,
    stateVersion: 3,
    playerId,
    character: { stats: { power: 10 } },
    progression: { level: 2, exp: 100, gold: 40 },
    activeExploration: {
      explorationId,
      zoneId,
      durationId: "short",
      startedAt: "2026-09-21T00:00:00.000Z",
      endsAt: "2026-09-21T00:05:00.000Z",
      seed: "seed-1",
      claimNonce: "nonce-1",
      characterSnapshot: { stats: { power: 10 } }
    },
    updatedAt: "2026-09-21T00:00:00.000Z"
  };

  const inventory: PlayerInventorySnapshot = {
    schemaVersion: 1,
    stateVersion: 5,
    playerId,
    equipment: { slots: {} },
    items: [],
    stackables: { quantities: {} },
    updatedAt: "2026-09-21T00:00:00.000Z"
  };

  it("applies rewards and produces the archive entry", () => {
    const drop = {
      itemInstanceId: "item-1" as ItemInstanceId,
      itemDefinitionId: "item-def-1" as ItemDefinitionId,
      createdAt: "2026-09-21T00:05:01.000Z"
    };

    const result = calculateClaim({
      core,
      inventory,
      exploration: core.activeExploration!,
      resolution: {
        result: "success",
        gold: 7,
        exp: 12,
        drops: [drop],
        summaryMetrics: {
          durationSeconds: 300
        }
      },
      claimedAt: "2026-09-21T00:05:01.000Z"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.previousCoreStateVersion).toBe(3);
    expect(result.value.previousInventoryStateVersion).toBe(5);
    expect(result.value.nextCore.stateVersion).toBe(4);
    expect(result.value.nextInventory.stateVersion).toBe(6);
    expect(result.value.nextCore.progression).toEqual({
      level: 2,
      exp: 112,
      gold: 47
    });
    expect(result.value.nextCore.activeExploration).toBeNull();
    expect(result.value.nextInventory.items).toEqual([drop]);
    expect(result.value.archiveEntry.rewards).toEqual({
      gold: 7,
      exp: 12,
      drops: [drop]
    });
    expect(result.value.archiveEntry.sync).toEqual({
      status: "pending",
      syncedAt: null
    });
  });

  it("applies claim EXP through the CP-21 progression rule", () => {
    const result = calculateClaim({
      core: {
        ...core,
        progression: { level: 2, exp: 8, gold: 40 }
      },
      inventory,
      exploration: core.activeExploration!,
      resolution: {
        result: "success",
        gold: 7,
        exp: 25,
        drops: [],
        summaryMetrics: {}
      },
      claimedAt: "2026-09-21T00:05:01.000Z",
      progressionRule: {
        maxLevel: 4,
        expRequiredForLevel: (level) => level * 10
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextCore.progression).toEqual({
      level: 3,
      exp: 13,
      gold: 47
    });
  });

  it("rejects claim before the end time", () => {
    const result = calculateClaim({
      core,
      inventory,
      exploration: core.activeExploration!,
      resolution: {
        result: "success",
        gold: 1,
        exp: 1,
        drops: [],
        summaryMetrics: {}
      },
      claimedAt: "2026-09-21T00:04:59.999Z"
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_exploration_state");
    expect(result.error.actualState).toBe("exploring");
  });

  it("rejects a mismatched exploration", () => {
    const result = calculateClaim({
      core,
      inventory,
      exploration: {
        ...core.activeExploration!,
        explorationId: "exploration-other" as ExplorationId
      },
      resolution: {
        result: "success",
        gold: 1,
        exp: 1,
        drops: [],
        summaryMetrics: {}
      },
      claimedAt: "2026-09-21T00:05:01.000Z"
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_exploration_state");
  });
});
