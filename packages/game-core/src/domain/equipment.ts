import type { IsoDateTime } from "./core-snapshot";
import type { ItemInstanceId } from "./ids";
import type { PlayerInventorySnapshot } from "./inventory-snapshot";
import type {
  InvalidEquipmentSlot,
  ItemNotOwned,
  MutationResult
} from "./mutation-result";

export type M1EquipmentSlot = "charm";

export interface EquipItemInput {
  readonly inventory: PlayerInventorySnapshot;
  readonly slot: string;
  readonly itemInstanceId: ItemInstanceId;
  readonly equippedAt: IsoDateTime;
}

export interface EquipItemOutput {
  readonly previousInventoryStateVersion: number;
  readonly nextInventory: PlayerInventorySnapshot;
}

export const M1_EQUIPMENT_SLOTS: readonly M1EquipmentSlot[] = ["charm"];

export function equipItem(
  input: EquipItemInput
): MutationResult<EquipItemOutput, InvalidEquipmentSlot | ItemNotOwned> {
  if (!M1_EQUIPMENT_SLOTS.includes(input.slot as M1EquipmentSlot)) {
    return {
      ok: false,
      error: {
        code: "invalid_equipment_slot",
        slot: input.slot,
        allowedSlots: M1_EQUIPMENT_SLOTS
      }
    };
  }

  const owned = input.inventory.items.some(
    (item) => item.itemInstanceId === input.itemInstanceId
  );
  if (!owned) {
    return {
      ok: false,
      error: {
        code: "item_not_owned",
        itemInstanceId: input.itemInstanceId
      }
    };
  }

  const nextInventory: PlayerInventorySnapshot = {
    ...input.inventory,
    stateVersion: input.inventory.stateVersion + 1,
    equipment: {
      slots: {
        ...input.inventory.equipment.slots,
        [input.slot]: input.itemInstanceId
      }
    },
    updatedAt: input.equippedAt
  };

  return {
    ok: true,
    value: {
      previousInventoryStateVersion: input.inventory.stateVersion,
      nextInventory
    }
  };
}
