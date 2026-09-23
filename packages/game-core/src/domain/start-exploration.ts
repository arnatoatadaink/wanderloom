import type { ActiveExploration, IsoDateTime, PlayerCoreSnapshot } from "./core-snapshot";
import type { ExplorationId, ZoneId } from "./ids";
import type { PlayerInventorySnapshot } from "./inventory-snapshot";
import { freezeExplorationCharacter, type EquipmentEffectDefinition } from "./equipment-effects";
import type { InvalidExplorationState, MutationResult } from "./mutation-result";
import { deriveExplorationState } from "./exploration-state";

export interface StartExplorationInput {
  readonly player: PlayerCoreSnapshot;
  readonly zoneId: ZoneId;
  readonly durationId: string;
  readonly durationMs: number;
  readonly explorationId: ExplorationId;
  readonly claimNonce: string;
  readonly seed: string;
  readonly startedAt: IsoDateTime;
  readonly inventory?: PlayerInventorySnapshot;
  readonly equipmentEffectDefinitions?: readonly EquipmentEffectDefinition[];
}

export interface StartExplorationOutput {
  readonly previousStateVersion: number;
  readonly nextCore: PlayerCoreSnapshot;
  readonly exploration: ActiveExploration;
}

export function startExploration(
  input: StartExplorationInput
): MutationResult<StartExplorationOutput, InvalidExplorationState> {
  const currentState = deriveExplorationState(
    input.player.activeExploration,
    input.startedAt
  );

  if (currentState !== "idle") {
    const active = input.player.activeExploration;
    if (active === null) {
      throw new Error("exploration state invariant violated");
    }

    return {
      ok: false,
      error: {
        code: "invalid_exploration_state",
        explorationId: active.explorationId,
        actualState: currentState,
        allowedStates: ["idle"]
      }
    };
  }

  const startedAtMs = Date.parse(input.startedAt);
  const characterSnapshot = input.inventory
    ? freezeExplorationCharacter({
        character: input.player.character,
        inventory: input.inventory,
        effectDefinitions: input.equipmentEffectDefinitions ?? []
      })
    : input.player.character;
  const exploration: ActiveExploration = {
    explorationId: input.explorationId,
    zoneId: input.zoneId,
    durationId: input.durationId,
    startedAt: input.startedAt,
    endsAt: new Date(startedAtMs + input.durationMs).toISOString(),
    seed: input.seed,
    claimNonce: input.claimNonce,
    characterSnapshot
  };

  const nextCore: PlayerCoreSnapshot = {
    ...input.player,
    stateVersion: input.player.stateVersion + 1,
    activeExploration: exploration,
    updatedAt: input.startedAt
  };

  return {
    ok: true,
    value: {
      previousStateVersion: input.player.stateVersion,
      nextCore,
      exploration
    }
  };
}
