import type { IsoDateTime } from "./core-snapshot";
import type {
  ItemDefinitionId,
  ItemInstanceId,
  PlayerId
} from "./ids";

export interface EquipmentState {
  /**
   * Keys are equipment-slot identifiers. Slot vocabulary is intentionally
   * deferred until equipment/game-balance design is fixed.
   */
  readonly slots: Readonly<Record<string, ItemInstanceId | null>>;
}

export interface ItemInstance {
  readonly itemInstanceId: ItemInstanceId;
  readonly itemDefinitionId: ItemDefinitionId;
  readonly rarity?: string;
  readonly createdAt: IsoDateTime;
}

export interface StackableState {
  /**
   * Keys are serialized ItemDefinitionId values.
   */
  readonly quantities: Readonly<Record<string, number>>;
}

export interface PlayerInventorySnapshot {
  readonly schemaVersion: number;
  readonly stateVersion: number;
  readonly playerId: PlayerId;
  readonly equipment: EquipmentState;
  readonly items: readonly ItemInstance[];
  readonly stackables: StackableState;
  readonly updatedAt: IsoDateTime;
}
