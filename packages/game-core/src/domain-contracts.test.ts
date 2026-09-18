import { describe, expect, it } from "vitest";

import type {
  ExplorationArchiveEntry,
  ExplorationId,
  ItemDefinitionId,
  ItemInstanceId,
  PlayerCoreSnapshot,
  PlayerId,
  PlayerInventorySnapshot,
  ZoneId
} from "./index";

describe("B-001 through B-004 domain contracts", () => {
  it("represent core, inventory, and archive snapshots with shared IDs", () => {
    const playerId = "player-1" as PlayerId;
    const explorationId = "exploration-1" as ExplorationId;
    const zoneId = "zone-1" as ZoneId;
    const itemDefinitionId = "item-def-1" as ItemDefinitionId;
    const itemInstanceId = "item-1" as ItemInstanceId;
    const now = "2026-09-18T09:00:00.000Z";

    const character = {
      stats: {
        power: 10
      }
    } as const;

    const core: PlayerCoreSnapshot = {
      schemaVersion: 1,
      stateVersion: 3,
      playerId,
      character,
      progression: {
        level: 2,
        exp: 120,
        gold: 45
      },
      activeExploration: {
        explorationId,
        zoneId,
        durationId: "short",
        startedAt: now,
        endsAt: "2026-09-18T09:05:00.000Z",
        seed: "seed-1",
        claimNonce: "claim-1",
        characterSnapshot: character
      },
      updatedAt: now
    };

    const inventory: PlayerInventorySnapshot = {
      schemaVersion: 1,
      stateVersion: 4,
      playerId,
      equipment: {
        slots: {
          weapon: itemInstanceId
        }
      },
      items: [
        {
          itemInstanceId,
          itemDefinitionId,
          createdAt: now
        }
      ],
      stackables: {
        quantities: {
          potion: 3
        }
      },
      updatedAt: now
    };

    const archive: ExplorationArchiveEntry = {
      schemaVersion: 1,
      playerId,
      explorationId,
      zoneId,
      durationId: "short",
      startedAt: now,
      endedAt: "2026-09-18T09:05:00.000Z",
      claimedAt: "2026-09-18T09:05:01.000Z",
      result: "resolved",
      rewards: {
        gold: 5,
        exp: 10,
        drops: inventory.items
      },
      summaryMetrics: {
        durationSeconds: 300
      },
      sync: {
        status: "pending",
        syncedAt: null
      }
    };

    expect(core.playerId).toBe(playerId);
    expect(inventory.items[0]?.itemInstanceId).toBe(itemInstanceId);
    expect(archive.rewards.drops).toHaveLength(1);
    expect(archive.sync.status).toBe("pending");
  });
});
