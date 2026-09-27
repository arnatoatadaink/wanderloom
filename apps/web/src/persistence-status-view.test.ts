import { describe, expect, it } from "vitest";

import {
  initialPersistenceViewState,
  type PersistenceViewState
} from "./persistence-state";
import { toPersistenceStatusView } from "./persistence-status-view";

describe("CP-37 persistence status view", () => {
  it("renders connected Google and Drive states explicitly", () => {
    const state: PersistenceViewState = {
      ...initialPersistenceViewState(),
      googleAccount: "connected",
      driveArchive: "connected"
    };

    expect(toPersistenceStatusView(state)).toEqual({
      googleLabel: "Connected",
      driveLabel: "Connected",
      driveMessage: null
    });
  });

  it("keeps a Drive outage local and explicit", () => {
    const state: PersistenceViewState = {
      ...initialPersistenceViewState(),
      googleAccount: "connected",
      driveArchive: "temporarily_unavailable",
      driveMessage: "provider_unavailable"
    };

    expect(toPersistenceStatusView(state)).toEqual({
      googleLabel: "Connected",
      driveLabel: "Temporarily unavailable",
      driveMessage: "provider_unavailable"
    });
  });
});
