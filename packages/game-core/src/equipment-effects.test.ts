import { describe, expect, it } from "vitest";
import {
  freezeExplorationCharacter,
  type ItemDefinitionId,
  type ItemInstanceId,
  type PlayerId,
  type PlayerInventorySnapshot
} from "./index";

describe("CP-23 equipment effects", () => {
  const charm = "charm-1" as ItemInstanceId;
  const definition = "wayfarer-charm" as ItemDefinitionId;
  const inventory: PlayerInventorySnapshot = {
    schemaVersion: 1,
    stateVersion: 1,
    playerId: "player-1" as PlayerId,
    equipment: { slots: { charm } },
    items: [{ itemInstanceId: charm, itemDefinitionId: definition, createdAt: "2026-09-23T00:00:00.000Z" }],
    stackables: { quantities: {} },
    updatedAt: "2026-09-23T00:00:00.000Z"
  };

  it("freezes equipped stat effects into effective exploration stats", () => {
    const frozen = freezeExplorationCharacter({
      character: { stats: { power: 10, luck: 1 } },
      inventory,
      effectDefinitions: [{ itemDefinitionId: definition, statModifiers: { power: 3, luck: 2 } }]
    });
    expect(frozen.baseStats).toEqual({ power: 10, luck: 1 });
    expect(frozen.stats).toEqual({ power: 13, luck: 3 });
    expect(frozen.equipmentEffects).toHaveLength(1);
  });

  it("returns a detached snapshot that later inventory/effect changes cannot rewrite", () => {
    const modifiers = { power: 3 };
    const frozen = freezeExplorationCharacter({
      character: { stats: { power: 10 } },
      inventory,
      effectDefinitions: [{ itemDefinitionId: definition, statModifiers: modifiers }]
    });
    modifiers.power = 99;
    expect(frozen.stats.power).toBe(13);
    expect(frozen.equipmentEffects[0]?.statModifiers.power).toBe(3);
  });
});
