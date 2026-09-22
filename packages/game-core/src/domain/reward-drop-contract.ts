import type { IsoDateTime } from "./core-snapshot";
import type {
  ExplorationId,
  ItemDefinitionId,
  ItemInstanceId,
  ZoneId
} from "./ids";
import type { ItemInstance } from "./inventory-snapshot";

export interface NumericRewardRange {
  readonly min: number;
  readonly max: number;
}

export interface DropCountRange {
  readonly minItems: number;
  readonly maxItems: number;
}

export interface RewardPreview {
  readonly gold: NumericRewardRange;
  readonly exp: NumericRewardRange;
  readonly drops: DropCountRange;
}

export interface DropGenerationInput {
  readonly seed: string;
  readonly explorationId: ExplorationId;
  readonly zoneId: ZoneId;
  readonly durationId: string;
}

export interface GeneratedDrop {
  readonly itemDefinitionId: ItemDefinitionId;
}

export interface DropGenerationResult {
  readonly drops: readonly GeneratedDrop[];
}

export interface InstantiateDropInput {
  readonly generatedDrop: GeneratedDrop;
  readonly itemInstanceId: ItemInstanceId;
  readonly createdAt: IsoDateTime;
}

export function instantiateDrop(input: InstantiateDropInput): ItemInstance {
  return {
    itemInstanceId: input.itemInstanceId,
    itemDefinitionId: input.generatedDrop.itemDefinitionId,
    createdAt: input.createdAt
  };
}
