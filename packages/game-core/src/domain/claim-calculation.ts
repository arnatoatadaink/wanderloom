import type { ExplorationArchiveEntry } from "./archive";
import type {
  ActiveExploration,
  IsoDateTime,
  PlayerCoreSnapshot
} from "./core-snapshot";
import type {
  ItemInstance,
  PlayerInventorySnapshot
} from "./inventory-snapshot";
import type {
  InvalidExplorationState,
  MutationResult
} from "./mutation-result";
import { deriveExplorationState } from "./exploration-state";
import { applyProgressionExp, type ProgressionRule } from "./progression";

export interface ExplorationResolution {
  readonly result: string;
  readonly gold: number;
  readonly exp: number;
  readonly drops: readonly ItemInstance[];
  readonly summaryMetrics: Readonly<Record<string, number>>;
}

export interface CalculateClaimInput {
  readonly core: PlayerCoreSnapshot;
  readonly inventory: PlayerInventorySnapshot;
  readonly exploration: ActiveExploration;
  readonly resolution: ExplorationResolution;
  readonly claimedAt: IsoDateTime;
  readonly progressionRule?: ProgressionRule;
}

export interface CalculateClaimOutput {
  readonly previousCoreStateVersion: number;
  readonly previousInventoryStateVersion: number;
  readonly nextCore: PlayerCoreSnapshot;
  readonly nextInventory: PlayerInventorySnapshot;
  readonly archiveEntry: ExplorationArchiveEntry;
}

export function calculateClaim(
  input: CalculateClaimInput
): MutationResult<CalculateClaimOutput, InvalidExplorationState> {
  const currentState = deriveExplorationState(
    input.core.activeExploration,
    input.claimedAt
  );

  if (
    currentState !== "ready_to_claim" ||
    input.core.activeExploration?.explorationId !== input.exploration.explorationId
  ) {
    return {
      ok: false,
      error: {
        code: "invalid_exploration_state",
        explorationId: input.exploration.explorationId,
        actualState: currentState,
        allowedStates: ["ready_to_claim"]
      }
    };
  }

  const progressed = input.progressionRule
    ? applyProgressionExp(input.core.progression, input.resolution.exp, input.progressionRule).next
    : {
        ...input.core.progression,
        exp: input.core.progression.exp + input.resolution.exp
      };

  const nextCore: PlayerCoreSnapshot = {
    ...input.core,
    stateVersion: input.core.stateVersion + 1,
    progression: {
      ...progressed,
      gold: progressed.gold + input.resolution.gold
    },
    activeExploration: null,
    updatedAt: input.claimedAt
  };

  const nextInventory: PlayerInventorySnapshot = {
    ...input.inventory,
    stateVersion: input.inventory.stateVersion + 1,
    items: [...input.inventory.items, ...input.resolution.drops],
    updatedAt: input.claimedAt
  };

  const archiveEntry: ExplorationArchiveEntry = {
    schemaVersion: input.core.schemaVersion,
    playerId: input.core.playerId,
    explorationId: input.exploration.explorationId,
    zoneId: input.exploration.zoneId,
    durationId: input.exploration.durationId,
    startedAt: input.exploration.startedAt,
    endedAt: input.exploration.endsAt,
    claimedAt: input.claimedAt,
    result: input.resolution.result,
    rewards: {
      gold: input.resolution.gold,
      exp: input.resolution.exp,
      drops: input.resolution.drops
    },
    summaryMetrics: input.resolution.summaryMetrics,
    sync: {
      status: "pending",
      syncedAt: null
    }
  };

  return {
    ok: true,
    value: {
      previousCoreStateVersion: input.core.stateVersion,
      previousInventoryStateVersion: input.inventory.stateVersion,
      nextCore,
      nextInventory,
      archiveEntry
    }
  };
}
