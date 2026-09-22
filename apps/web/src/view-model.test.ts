import { describe, expect, it } from "vitest";

import {
  chooseInitialSelection,
  deriveExplorationPhase,
  remainingSeconds
} from "./view-model";

describe("CP-11/17 view model", () => {
  it("chooses the first zone and duration", () => {
    expect(
      chooseInitialSelection([
        {
          zoneId: "zone-1",
          name: "Zone 1",
          durations: [
            {
              durationId: "short",
              durationMs: 300_000,
              preview: {
                gold: { min: 5, max: 5 },
                exp: { min: 10, max: 10 },
                drops: { minItems: 0, maxItems: 0 }
              }
            }
          ]
        }
      ])
    ).toEqual({
      zoneId: "zone-1",
      durationId: "short"
    });
  });

  it("derives exploring and claimable from server end time", () => {
    const exploration = {
      explorationId: "exp-1",
      zoneId: "zone-1",
      durationId: "short",
      startedAt: "2026-09-21T00:00:00.000Z",
      endsAt: "2026-09-21T00:05:00.000Z"
    };

    expect(
      deriveExplorationPhase(
        exploration,
        Date.parse("2026-09-21T00:04:59.999Z")
      )
    ).toBe("exploring");

    expect(
      deriveExplorationPhase(
        exploration,
        Date.parse("2026-09-21T00:05:00.000Z")
      )
    ).toBe("claimable");
  });

  it("rounds the countdown upward and clamps at zero", () => {
    const endsAt = "2026-09-21T00:05:00.000Z";

    expect(
      remainingSeconds(
        endsAt,
        Date.parse("2026-09-21T00:04:58.100Z")
      )
    ).toBe(2);

    expect(
      remainingSeconds(
        endsAt,
        Date.parse("2026-09-21T00:05:01.000Z")
      )
    ).toBe(0);
  });
});
