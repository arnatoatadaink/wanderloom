import { describe, expect, it } from "vitest";

import {
  calculateClaim,
  readPlayerZoneRank,
  type ExplorationId,
  type PlayerCoreSnapshot,
  type PlayerId,
  type PlayerInventorySnapshot,
  type ZoneId
} from "./index";

const playerId = "player-zone-rank" as PlayerId;
const inventory: PlayerInventorySnapshot = {
  schemaVersion: 1,
  stateVersion: 1,
  playerId,
  equipment: { slots: {} },
  items: [],
  stackables: { quantities: {} },
  updatedAt: "2026-10-02T00:00:00.000Z"
};

function coreFor(zoneId: ZoneId, zoneRank?: number): PlayerCoreSnapshot {
  return {
    schemaVersion: 1,
    stateVersion: 1,
    playerId,
    character: { stats: {} },
    progression: { level: 1, exp: 0, gold: 0 },
    ...(zoneRank === undefined ? {} : { zoneRank }),
    activeExploration: {
      explorationId: "exploration-zone-rank" as ExplorationId,
      zoneId,
      durationId: "Short",
      startedAt: "2026-10-02T00:00:00.000Z",
      endsAt: "2026-10-02T00:30:00.000Z",
      seed: "zone-rank-seed",
      claimNonce: "zone-rank-nonce",
      characterSnapshot: { stats: {} }
    },
    updatedAt: "2026-10-02T00:00:00.000Z"
  };
}

function claim(core: PlayerCoreSnapshot, result: string) {
  return calculateClaim({
    core,
    inventory,
    exploration: core.activeExploration!,
    resolution: {
      result,
      gold: 0,
      exp: 0,
      drops: [],
      summaryMetrics: {}
    },
    claimedAt: "2026-10-02T00:30:01.000Z"
  });
}

describe("ADR-024 zone rank runtime persistence", () => {
  it("reads legacy snapshots without zoneRank as Rank 0", () => {
    expect(readPlayerZoneRank(coreFor("wayfarer-meadow" as ZoneId))).toBe(0);
  });

  it("writes explicit Rank 1 after a successful starter-zone claim", () => {
    const result = claim(coreFor("wayfarer-meadow" as ZoneId), "success");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextCore.zoneRank).toBe(1);
  });

  it("does not advance rank after failure", () => {
    const result = claim(coreFor("wayfarer-meadow" as ZoneId), "failure");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextCore.zoneRank).toBe(0);
  });

  it("does not advance when replaying a lower-rank production zone", () => {
    const result = claim(coreFor("wayfarer-meadow" as ZoneId, 2), "success");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextCore.zoneRank).toBe(2);
  });

  it("advances the configured current-rank zone by exactly one", () => {
    const result = claim(coreFor("shattered-causeway" as ZoneId, 2), "success");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextCore.zoneRank).toBe(3);
  });

  it("keeps legacy non-production zones compatible while normalizing zoneRank", () => {
    const result = claim(coreFor("legacy-zone" as ZoneId), "success");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextCore.zoneRank).toBe(0);
  });
});
