import { describe, expect, it } from "vitest";

import type {
  AlreadyClaimed,
  ExplorationId,
  InvalidExplorationState,
  MutationError,
  MutationResult,
  SnapshotIntegrityError,
  VersionConflict
} from "./index";

function describeMutationError(error: MutationError): string {
  switch (error.code) {
    case "version_conflict":
      return `${error.snapshot}:${error.expectedVersion}->${error.actualVersion}`;
    case "already_claimed":
      return `${error.explorationId}:${error.claimedAt}`;
    case "invalid_exploration_state":
      return `${error.actualState}:${error.allowedStates.join(",")}`;
    case "snapshot_integrity_error":
      return `${error.snapshot}:${error.violations.length}`;
  }
}

describe("B-005 mutation results and errors", () => {
  const explorationId = "exploration-1" as ExplorationId;

  it("narrows every mutation error by its stable code", () => {
    const errors: readonly MutationError[] = [
      {
        code: "version_conflict",
        snapshot: "core",
        expectedVersion: 3,
        actualVersion: 4
      } satisfies VersionConflict,
      {
        code: "already_claimed",
        explorationId,
        claimedAt: "2026-09-18T09:05:01.000Z"
      } satisfies AlreadyClaimed,
      {
        code: "invalid_exploration_state",
        explorationId,
        actualState: "exploring",
        allowedStates: ["ready_to_claim"]
      } satisfies InvalidExplorationState,
      {
        code: "snapshot_integrity_error",
        snapshot: "inventory",
        violations: [
          {
            path: "stackables.quantities.potion",
            message: "must be a non-negative finite number"
          }
        ]
      } satisfies SnapshotIntegrityError
    ];

    expect(errors.map(describeMutationError)).toEqual([
      "core:3->4",
      "exploration-1:2026-09-18T09:05:01.000Z",
      "exploring:ready_to_claim",
      "inventory:1"
    ]);
  });

  it("represents success and failure without exceptions", () => {
    const success: MutationResult<{ readonly stateVersion: number }> = {
      ok: true,
      value: { stateVersion: 5 }
    };
    const failure: MutationResult<never, VersionConflict> = {
      ok: false,
      error: {
        code: "version_conflict",
        snapshot: "inventory",
        expectedVersion: 4,
        actualVersion: 5
      }
    };

    expect(success.ok && success.value.stateVersion).toBe(5);
    expect(!failure.ok && failure.error.code).toBe("version_conflict");
  });
});
