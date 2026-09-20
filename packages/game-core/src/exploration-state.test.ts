import { describe, expect, it } from "vitest";

import type { ActiveExploration, ExplorationId, ZoneId } from "./index";
import {
  canTransitionExploration,
  deriveExplorationState,
  transitionExploration
} from "./index";

describe("E-001 exploration state machine", () => {
  const activeExploration: ActiveExploration = {
    explorationId: "exploration-1" as ExplorationId,
    zoneId: "zone-1" as ZoneId,
    durationId: "short",
    startedAt: "2026-09-20T09:00:00.000Z",
    endsAt: "2026-09-20T09:05:00.000Z",
    seed: "seed-1",
    claimNonce: "claim-1",
    characterSnapshot: {
      stats: {
        power: 10
      }
    }
  };

  it("allows only the forward M1 lifecycle", () => {
    expect(transitionExploration("idle", "start")).toBe("exploring");
    expect(transitionExploration("exploring", "reach_end_time")).toBe(
      "ready_to_claim"
    );
    expect(transitionExploration("ready_to_claim", "claim")).toBe("claimed");
  });

  it("rejects skipped or repeated transitions", () => {
    expect(canTransitionExploration("idle", "claim")).toBe(false);
    expect(transitionExploration("idle", "claim")).toBeNull();
    expect(transitionExploration("exploring", "start")).toBeNull();
    expect(transitionExploration("claimed", "claim")).toBeNull();
  });

  it("derives idle when there is no active exploration", () => {
    expect(
      deriveExplorationState(null, "2026-09-20T09:00:00.000Z")
    ).toBe("idle");
  });

  it("derives exploring before the server-authoritative end time", () => {
    expect(
      deriveExplorationState(
        activeExploration,
        "2026-09-20T09:04:59.999Z"
      )
    ).toBe("exploring");
  });

  it("derives ready_to_claim at and after the end time", () => {
    expect(
      deriveExplorationState(
        activeExploration,
        "2026-09-20T09:05:00.000Z"
      )
    ).toBe("ready_to_claim");

    expect(
      deriveExplorationState(
        activeExploration,
        "2026-09-20T09:10:00.000Z"
      )
    ).toBe("ready_to_claim");
  });
});
