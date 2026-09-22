import { describe, expect, it } from "vitest";

import type {
  ArchiveRepository,
  AtomicMutation,
  AtomicMutationCommit,
  AtomicMutationRepository,
  CoreSnapshotRepository,
  ExplorationArchiveEntry,
  ExplorationId,
  InventorySnapshotRepository,
  MutationResult,
  PlayerCoreSnapshot,
  PlayerId,
  PlayerInventorySnapshot,
  PlayerRecord,
  PlayerRepository
} from "./index";

describe("C-002 repository interfaces", () => {
  const playerId = "player-1" as PlayerId;
  const explorationId = "exploration-1" as ExplorationId;

  it("keeps repository contracts storage-agnostic", () => {
    const playerRepository: PlayerRepository = {
      async findById() {
        return null;
      },
      async insert(_player: PlayerRecord) {}
    };

    const coreRepository: CoreSnapshotRepository = {
      async findByPlayerId() {
        return null;
      },
      async insert(_snapshot: PlayerCoreSnapshot) {},
      async updateIfVersionMatches(
        _snapshot: PlayerCoreSnapshot,
        _expectedStateVersion: number
      ) {
        return true;
      }
    };

    const inventoryRepository: InventorySnapshotRepository = {
      async findByPlayerId() {
        return null;
      },
      async insert(_snapshot: PlayerInventorySnapshot) {},
      async updateIfVersionMatches(
        _snapshot: PlayerInventorySnapshot,
        _expectedStateVersion: number
      ) {
        return true;
      }
    };

    const archiveRepository: ArchiveRepository = {
      async listRecent() {
        return [];
      },
      async append(_entry: ExplorationArchiveEntry) {},
      async pruneRecent() {
        return 0;
      },
      async listPendingSync() {
        return [];
      },
      async markSynced() {
        return true;
      }
    };

    expect(playerRepository).toBeDefined();
    expect(coreRepository).toBeDefined();
    expect(inventoryRepository).toBeDefined();
    expect(archiveRepository).toBeDefined();
  });

  it("models core, core+inventory, and claim atomic boundaries", async () => {
    const repository: AtomicMutationRepository = {
      async commit(
        mutation: AtomicMutation
      ): Promise<MutationResult<AtomicMutationCommit>> {
        const coreStateVersion =
          mutation.kind === "inventory"
            ? null
            : mutation.nextCore.stateVersion;
        const inventoryStateVersion =
          mutation.kind === "core"
            ? null
            : mutation.nextInventory.stateVersion;
        const committedExplorationId =
          mutation.kind === "claim"
            ? mutation.archiveEntry.explorationId
            : null;

        return {
          ok: true,
          value: {
            coreStateVersion,
            inventoryStateVersion,
            explorationId: committedExplorationId
          }
        };
      }
    };

    const mutation = {
      kind: "core",
      playerId,
      expectedCoreStateVersion: 2,
      nextCore: {
        schemaVersion: 1,
        stateVersion: 3,
        playerId,
        character: { stats: { power: 10 } },
        progression: { level: 2, exp: 120, gold: 45 },
        activeExploration: null,
        updatedAt: "2026-09-20T09:00:00.000Z"
      }
    } satisfies AtomicMutation;

    const result = await repository.commit(mutation);

    expect(result.ok && result.value.coreStateVersion).toBe(3);
    expect(explorationId).toBe("exploration-1");
  });
});
