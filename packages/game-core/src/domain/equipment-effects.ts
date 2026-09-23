import type { CharacterState, CharacterStats } from "./core-snapshot";
import type { ItemDefinitionId, ItemInstanceId } from "./ids";
import type { PlayerInventorySnapshot } from "./inventory-snapshot";

export type StatModifierMap = Readonly<Record<string, number>>;

export interface EquipmentEffectDefinition {
  readonly itemDefinitionId: ItemDefinitionId;
  readonly statModifiers: StatModifierMap;
}

export interface FrozenEquipmentEffect {
  readonly slot: string;
  readonly itemInstanceId: ItemInstanceId;
  readonly itemDefinitionId: ItemDefinitionId;
  readonly statModifiers: StatModifierMap;
}

export interface ExplorationCharacterSnapshot extends CharacterState {
  readonly baseStats: CharacterStats;
  readonly equipmentEffects: readonly FrozenEquipmentEffect[];
}

function addStats(base: CharacterStats, modifiers: StatModifierMap): CharacterStats {
  const next: Record<string, number> = { ...base };
  for (const [stat, amount] of Object.entries(modifiers)) {
    if (!Number.isFinite(amount)) throw new RangeError("equipment stat modifier must be finite");
    next[stat] = (next[stat] ?? 0) + amount;
  }
  return next;
}

export function freezeExplorationCharacter(input: {
  readonly character: CharacterState;
  readonly inventory: PlayerInventorySnapshot;
  readonly effectDefinitions: readonly EquipmentEffectDefinition[];
}): ExplorationCharacterSnapshot {
  const effects: FrozenEquipmentEffect[] = [];

  for (const [slot, itemInstanceId] of Object.entries(input.inventory.equipment.slots)) {
    if (itemInstanceId === null) continue;
    const item = input.inventory.items.find((candidate) => candidate.itemInstanceId === itemInstanceId);
    if (!item) throw new RangeError("equipped item must exist in inventory");
    const definition = input.effectDefinitions.find(
      (candidate) => candidate.itemDefinitionId === item.itemDefinitionId
    );
    if (!definition) continue;
    effects.push({
      slot,
      itemInstanceId,
      itemDefinitionId: item.itemDefinitionId,
      statModifiers: { ...definition.statModifiers }
    });
  }

  const stats = effects.reduce(
    (current, effect) => addStats(current, effect.statModifiers),
    { ...input.character.stats }
  );

  return {
    stats,
    baseStats: { ...input.character.stats },
    equipmentEffects: effects
  };
}
