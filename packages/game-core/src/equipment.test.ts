import { describe, expect, it } from "vitest";

import {
  equipItem,
  type ItemDefinitionId,
  type ItemInstanceId,
  type PlayerId,
  type PlayerInventorySnapshot
} from "./index";

const itemInstanceId = "item-1" as ItemInstanceId;
const inventory: PlayerInventorySnapshot = {
  schemaVersion: 1,
  stateVersion: 1,
  playerId: "player-1" as PlayerId,
  equipment: { slots: {} },
  items: [{
    itemInstanceId,
    itemDefinitionId: "m1-wayfarer-charm" as ItemDefinitionId,
    createdAt: "2026-09-22T00:00:00.000Z"
  }],
  stackables: { quantities: {} },
  updatedAt: "2026-09-22T00:00:00.000Z"
};

describe("CP-16 equipment domain", () => {
  it("equips an owned item into the M1 charm slot", () => {
    const result = equipItem({
      inventory,
      slot: "charm",
      itemInstanceId,
      equippedAt: "2026-09-22T00:01:00.000Z"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextInventory.stateVersion).toBe(2);
    expect(result.value.nextInventory.equipment.slots.charm).toBe(itemInstanceId);
  });

  it("rejects invalid slots and unowned items", () => {
    expect(equipItem({
      inventory,
      slot: "weapon",
      itemInstanceId,
      equippedAt: "2026-09-22T00:01:00.000Z"
    })).toMatchObject({ ok: false, error: { code: "invalid_equipment_slot" } });

    expect(equipItem({
      inventory,
      slot: "charm",
      itemInstanceId: "missing" as ItemInstanceId,
      equippedAt: "2026-09-22T00:01:00.000Z"
    })).toMatchObject({ ok: false, error: { code: "item_not_owned" } });
  });
});
