import type { ExplorationId, ItemDefinitionId, ZoneId } from "./ids";
import type { GeneratedDrop } from "./reward-drop-contract";

export interface SeededM1ResolutionInput {
  readonly seed: string;
  readonly explorationId: ExplorationId;
  readonly zoneId: ZoneId;
  readonly durationId: string;
}

export interface SeededM1Resolution {
  readonly result: "success";
  readonly gold: number;
  readonly exp: number;
  readonly generatedDrops: readonly GeneratedDrop[];
  readonly summaryMetrics: Readonly<Record<string, number>>;
}

export const M1_WAYFARER_CHARM_ITEM_DEFINITION_ID =
  "m1-wayfarer-charm" as ItemDefinitionId;

function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

export function resolveSeededM1Exploration(
  input: SeededM1ResolutionInput
): SeededM1Resolution {
  const seedHash = hashSeed(input.seed);

  return {
    result: "success",
    gold: 5 + (seedHash % 2),
    exp: 10,
    generatedDrops: [
      {
        itemDefinitionId: M1_WAYFARER_CHARM_ITEM_DEFINITION_ID
      }
    ],
    summaryMetrics: {
      seedBucket: seedHash % 2
    }
  };
}
