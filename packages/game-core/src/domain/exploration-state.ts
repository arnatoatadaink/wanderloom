import type { ActiveExploration, IsoDateTime } from "./core-snapshot";

export type ExplorationState =
  | "idle"
  | "exploring"
  | "ready_to_claim"
  | "claimed";

export type ExplorationEvent =
  | "start"
  | "reach_end_time"
  | "claim";

const transitions: Readonly<
  Record<ExplorationState, Partial<Record<ExplorationEvent, ExplorationState>>>
> = {
  idle: {
    start: "exploring"
  },
  exploring: {
    reach_end_time: "ready_to_claim"
  },
  ready_to_claim: {
    claim: "claimed"
  },
  claimed: {}
};

export function canTransitionExploration(
  state: ExplorationState,
  event: ExplorationEvent
): boolean {
  return transitions[state][event] !== undefined;
}

export function transitionExploration(
  state: ExplorationState,
  event: ExplorationEvent
): ExplorationState | null {
  return transitions[state][event] ?? null;
}

/**
 * Derives the persisted player's current exploration state.
 *
 * "claimed" is intentionally not derived from PlayerCoreSnapshot because a
 * successful claim removes the active exploration from the core snapshot.
 * Claim history belongs to the archive layer.
 */
export function deriveExplorationState(
  activeExploration: ActiveExploration | null,
  now: IsoDateTime
): Exclude<ExplorationState, "claimed"> {
  if (activeExploration === null) {
    return "idle";
  }

  return Date.parse(now) >= Date.parse(activeExploration.endsAt)
    ? "ready_to_claim"
    : "exploring";
}
