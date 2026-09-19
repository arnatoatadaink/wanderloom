import type { IsoDateTime } from "./core-snapshot";
import type { ExplorationId } from "./ids";

export type SnapshotKind = "core" | "inventory";

export interface VersionConflict {
  readonly code: "version_conflict";
  readonly snapshot: SnapshotKind;
  readonly expectedVersion: number;
  readonly actualVersion: number;
}

export interface AlreadyClaimed {
  readonly code: "already_claimed";
  readonly explorationId: ExplorationId;
  readonly claimedAt: IsoDateTime;
}

export interface InvalidExplorationState {
  readonly code: "invalid_exploration_state";
  readonly explorationId: ExplorationId;
  /**
   * Exploration-state vocabulary is defined with the exploration state
   * machine. Keeping these values as strings avoids duplicating that contract.
   */
  readonly actualState: string;
  readonly allowedStates: readonly string[];
}

export interface SnapshotIntegrityViolation {
  /** Dot-separated path within the snapshot, for example progression.gold. */
  readonly path: string;
  readonly message: string;
}

export interface SnapshotIntegrityError {
  readonly code: "snapshot_integrity_error";
  readonly snapshot: SnapshotKind;
  readonly violations: readonly SnapshotIntegrityViolation[];
}

export type MutationError =
  | VersionConflict
  | AlreadyClaimed
  | InvalidExplorationState
  | SnapshotIntegrityError;

export interface MutationSuccess<Value> {
  readonly ok: true;
  readonly value: Value;
}

export interface MutationFailure<Error extends MutationError = MutationError> {
  readonly ok: false;
  readonly error: Error;
}

export type MutationResult<
  Value,
  Error extends MutationError = MutationError
> = MutationSuccess<Value> | MutationFailure<Error>;
