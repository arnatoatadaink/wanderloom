import { describe, expect, it } from "vitest";

import type {
  ClaimAtomicMutation,
  ExplorationArchiveEntry,
  ExplorationId,
  PlayerCoreSnapshot,
  PlayerId,
  PlayerInventorySnapshot,
  ZoneId
} from "@wanderloom/game-core";
import {
  D1AtomicMutationRepository,
  type D1AtomicDatabaseLike
} from "./d1-atomic-mutation-repository";

class FakeStatement {
  readonly values: unknown[] = [];

  constructor(
    readonly query: string,
    private readonly firstHandler: (query: string, values: readonly unknown[]) => unknown
  ) {}

  bind(...values: unknown[]): FakeStatement {
    this.values.splice(0, this.values.length, ...values);
    return this;
  }

  async first<T>(): Promise<T | null> {
    return (this.firstHandler(this.query, this.values) ?? null) as T | null;
  }
}

function makeMutation(): ClaimAtomicMutation {
  const playerId = "player-1" as PlayerId;
  const explorationId = "exploration-1" as ExplorationId;
  const zoneId = "zone-1" as ZoneId;

  const nextCore: PlayerCoreSnapshot = {
    schemaVersion: 1,
    stateVersion: 4,
    playerId,
    character: { stats: { power: 10 } },
    progression: { level: 2, exp: 112, gold: 47 },
    activeExploration: null,
    updatedAt: "2026-09-21T00:05:01.000Z"
  };

  const nextInventory: PlayerInventorySnapshot = {
    schemaVersion: 1,
    stateVersion: 6,
    playerId,
    equipment: { slots: {} },
    items: [],
    stackables: { quantities: {} },
    updatedAt: "2026-09-21T00:05:01.000Z"
  };

  const archiveEntry: ExplorationArchiveEntry = {
    schemaVersion: 1,
    playerId,
    explorationId,
    zoneId,
    durationId: "short",
    startedAt: "2026-09-21T00:00:00.000Z",
    endedAt: "2026-09-21T00:05:00.000Z",
    claimedAt: "2026-09-21T00:05:01.000Z",
    result: "success",
    rewards: { gold: 7, exp: 12, drops: [] },
    summaryMetrics: { durationSeconds: 300 },
    sync: { status: "pending", syncedAt: null }
  };

  return {
    kind: "claim",
    playerId,
    claimNonce: "nonce-1",
    expectedCoreStateVersion: 3,
    nextCore,
    expectedInventoryStateVersion: 5,
    nextInventory,
    archiveEntry
  };
}

describe("CP-16 D1 inventory mutation", () => {
  it("commits an inventory-only CAS update", async () => {
    const mutation = makeMutation();
    const db: D1AtomicDatabaseLike = {
      prepare(query) {
        return new FakeStatement(query, () => null);
      },
      async batch(statements) {
        expect(statements).toHaveLength(1);
        return [{ meta: { changes: 1 } }];
      }
    };
    const repository = new D1AtomicMutationRepository(db, {
      recentArchiveRetention: 3
    });
    const result = await repository.commit({
      kind: "inventory",
      playerId: mutation.playerId,
      expectedInventoryStateVersion: 5,
      nextInventory: mutation.nextInventory
    });
    expect(result).toEqual({
      ok: true,
      value: {
        coreStateVersion: null,
        inventoryStateVersion: 6,
        explorationId: null
      }
    });
  });

  it("returns inventory version conflict on stale CAS", async () => {
    const mutation = makeMutation();
    const db: D1AtomicDatabaseLike = {
      prepare(query) {
        return new FakeStatement(query, (sql) =>
          sql.includes("SELECT state_version") ? { state_version: 8 } : null
        );
      },
      async batch() {
        return [{ meta: { changes: 0 } }];
      }
    };
    const repository = new D1AtomicMutationRepository(db, {
      recentArchiveRetention: 3
    });
    const result = await repository.commit({
      kind: "inventory",
      playerId: mutation.playerId,
      expectedInventoryStateVersion: 5,
      nextInventory: mutation.nextInventory
    });
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "version_conflict",
        snapshot: "inventory",
        expectedVersion: 5,
        actualVersion: 8
      }
    });
  });
});

describe("CP-09 D1 atomic claim mutation", () => {
  it("commits the six-statement guarded claim batch", async () => {
    const prepared: FakeStatement[] = [];
    const db: D1AtomicDatabaseLike = {
      prepare(query) {
        const statement = new FakeStatement(query, () => null);
        prepared.push(statement);
        return statement;
      },
      async batch(statements) {
        expect(statements).toHaveLength(6);
        return [
          { meta: { changes: 1 } },
          { meta: { changes: 1 } },
          { meta: { changes: 1 } },
          { meta: { changes: 1 } },
          { meta: { changes: 0 } },
          { meta: { changes: 1 } }
        ];
      }
    };

    const repository = new D1AtomicMutationRepository(db, {
      recentArchiveRetention: 3,
      guardTokenFactory: () => "guard-1"
    });

    const result = await repository.commit(makeMutation());

    expect(result).toEqual({
      ok: true,
      value: {
        coreStateVersion: 4,
        inventoryStateVersion: 6,
        explorationId: "exploration-1"
      }
    });
    expect(prepared[0]?.query).toContain("player_mutation_guards");
    expect(prepared[1]?.query).toContain("UPDATE player_core");
    expect(prepared[2]?.query).toContain("UPDATE player_inventory");
    expect(prepared[3]?.query).toContain("INSERT INTO recent_archive");
    expect(prepared[4]?.query).toContain("LIMIT -1 OFFSET");
    expect(prepared[5]?.query).toContain("DELETE FROM player_mutation_guards");
  });

  it("returns already_claimed when a retry sees the archive entry", async () => {
    const mutation = makeMutation();
    const db: D1AtomicDatabaseLike = {
      prepare(query) {
        return new FakeStatement(query, (sql) => {
          if (sql.includes("SELECT claimed_at")) {
            return { claimed_at: mutation.archiveEntry.claimedAt };
          }
          return null;
        });
      },
      async batch() {
        return [
          { meta: { changes: 0 } },
          { meta: { changes: 0 } },
          { meta: { changes: 0 } },
          { meta: { changes: 0 } },
          { meta: { changes: 0 } },
          { meta: { changes: 0 } }
        ];
      }
    };

    const repository = new D1AtomicMutationRepository(db, {
      recentArchiveRetention: 3,
      guardTokenFactory: () => "guard-2"
    });

    const result = await repository.commit(mutation);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("already_claimed");
  });

  it("returns an observed core version conflict when guard acquisition fails", async () => {
    const mutation = makeMutation();
    const currentCore = {
      ...mutation.nextCore,
      stateVersion: 9
    };

    const db: D1AtomicDatabaseLike = {
      prepare(query) {
        return new FakeStatement(query, (sql) => {
          if (sql.includes("SELECT claimed_at")) return null;
          if (sql.includes("SELECT state_version, snapshot_json")) {
            return {
              state_version: 9,
              snapshot_json: JSON.stringify(currentCore)
            };
          }
          return null;
        });
      },
      async batch() {
        return [
          { meta: { changes: 0 } },
          { meta: { changes: 0 } },
          { meta: { changes: 0 } },
          { meta: { changes: 0 } },
          { meta: { changes: 0 } },
          { meta: { changes: 0 } }
        ];
      }
    };

    const repository = new D1AtomicMutationRepository(db, {
      recentArchiveRetention: 3,
      guardTokenFactory: () => "guard-3"
    });

    const result = await repository.commit(mutation);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      code: "version_conflict",
      snapshot: "core",
      expectedVersion: 3,
      actualVersion: 9
    });
  });
});
