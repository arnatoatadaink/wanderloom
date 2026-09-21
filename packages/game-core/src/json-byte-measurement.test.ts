import { describe, expect, it } from "vitest";

import {
  measureJsonUtf8,
  type PlayerCoreSnapshot,
  type PlayerInventorySnapshot
} from "./index";

describe("snapshot byte measurement", () => {
  it("measures UTF-8 serialized snapshot bytes", () => {
    const core: PlayerCoreSnapshot = {
      schemaVersion: 1,
      stateVersion: 0,
      playerId: "player-1",
      character: { stats: {} },
      progression: { level: 1, exp: 0, gold: 0 },
      activeExploration: null,
      updatedAt: "2026-09-21T00:00:00.000Z"
    };

    const inventory: PlayerInventorySnapshot = {
      schemaVersion: 1,
      stateVersion: 0,
      playerId: "player-1",
      equipment: { slots: {} },
      items: [],
      stackables: { quantities: {} },
      updatedAt: "2026-09-21T00:00:00.000Z"
    };

    const coreMeasurement = measureJsonUtf8(core);
    const inventoryMeasurement = measureJsonUtf8(inventory);

    expect(coreMeasurement.bytes).toBeGreaterThan(0);
    expect(inventoryMeasurement.bytes).toBeGreaterThan(0);
    expect(coreMeasurement.bytes).toBe(
      new TextEncoder().encode(coreMeasurement.json).byteLength
    );
    expect(inventoryMeasurement.bytes).toBe(
      new TextEncoder().encode(inventoryMeasurement.json).byteLength
    );
  });
});
