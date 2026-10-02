import { describe, expect, it } from "vitest";
import type { PlayerCoreSnapshot, PlayerId, ZoneId } from "@wanderloom/game-core";
import { D1CoreSnapshotRepository } from "./d1-core-snapshot-repository";

class FakeStatement {
  private values: unknown[] = [];

  constructor(
    private readonly sql: string,
    private readonly state: { snapshotJson: string | null }
  ) {}

  bind(...values: unknown[]): FakeStatement {
    this.values = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    if (!this.sql.includes("SELECT snapshot_json") || this.state.snapshotJson === null) {
      return null;
    }
    return { snapshot_json: this.state.snapshotJson } as T;
  }

  async run(): Promise<{ meta: { changes: number } }> {
    if (this.sql.includes("INSERT INTO player_core")) {
      this.state.snapshotJson = this.values[8] as string;
      return { meta: { changes: 1 } };
    }
    if (this.sql.includes("UPDATE player_core")) {
      this.state.snapshotJson = this.values[8] as string;
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 0 } };
  }
}

class FakeDb {
  readonly state = { snapshotJson: null as string | null };

  prepare(sql: string): FakeStatement {
    return new FakeStatement(sql, this.state);
  }
}

describe("D1 core snapshot Zone Rank persistence", () => {
  it("round-trips explicit zoneRank through snapshot_json", async () => {
    const playerId = "player-zone-rank-d1" as PlayerId;
    const snapshot: PlayerCoreSnapshot = {
      schemaVersion: 1,
      stateVersion: 3,
      playerId,
      character: { stats: {} },
      progression: { level: 1, exp: 0, gold: 0 },
      zoneRank: 3,
      activeExploration: null,
      updatedAt: "2026-10-02T00:00:00.000Z"
    };

    const db = new FakeDb();
    const repository = new D1CoreSnapshotRepository(db as never);

    await repository.insert(snapshot);
    const loaded = await repository.findByPlayerId(playerId);

    expect(loaded).not.toBeNull();
    expect(loaded?.zoneRank).toBe(3);
    expect(loaded).toEqual(snapshot);
  });

  it("round-trips a claimed production-zone snapshot without a schema change", async () => {
    const playerId = "player-zone-rank-claim" as PlayerId;
    const snapshot: PlayerCoreSnapshot = {
      schemaVersion: 1,
      stateVersion: 4,
      playerId,
      character: { stats: {} },
      progression: { level: 1, exp: 8, gold: 10 },
      zoneRank: 1,
      activeExploration: null,
      updatedAt: "2026-10-02T00:30:01.000Z"
    };

    const db = new FakeDb();
    const repository = new D1CoreSnapshotRepository(db as never);
    await repository.insert(snapshot);

    const loaded = await repository.findByPlayerId(playerId);
    expect(loaded?.schemaVersion).toBe(1);
    expect(loaded?.zoneRank).toBe(1);
  });
});
