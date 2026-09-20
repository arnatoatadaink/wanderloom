import type {
  CoreSnapshotRepository,
  MutationResult,
  PlayerCoreSnapshot,
  VersionConflict
} from "@wanderloom/game-core";
import { startExploration, type StartExplorationInput } from "@wanderloom/game-core";

export interface StartExplorationPersistenceInput
  extends Omit<StartExplorationInput, "player"> {
  readonly player: PlayerCoreSnapshot;
}

export async function persistStartedExploration(
  repository: CoreSnapshotRepository,
  input: StartExplorationPersistenceInput
): Promise<
  MutationResult<
    PlayerCoreSnapshot,
    VersionConflict | Extract<
      ReturnType<typeof startExploration>,
      { readonly ok: false }
    >["error"]
  >
> {
  const created = startExploration(input);
  if (!created.ok) {
    return created;
  }

  const updated = await repository.updateIfVersionMatches(
    created.value.nextCore,
    created.value.previousStateVersion
  );

  if (!updated) {
    return {
      ok: false,
      error: {
        code: "version_conflict",
        snapshot: "core",
        expectedVersion: created.value.previousStateVersion,
        actualVersion: created.value.previousStateVersion + 1
      }
    };
  }

  return {
    ok: true,
    value: created.value.nextCore
  };
}
