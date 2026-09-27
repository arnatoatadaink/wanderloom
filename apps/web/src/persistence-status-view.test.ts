import { describe, expect, it } from "vitest";

import {
  initialPersistenceViewState,
  type PersistenceViewState
} from "./persistence-state";
import { toPersistenceStatusView } from "./persistence-status-view";

describe("CP-37/40 persistence status view", () => {
  it("renders connected Google and Drive states explicitly", () => {
    const state: PersistenceViewState = {
      ...initialPersistenceViewState(),
      googleAccount: "connected",
      driveArchive: "connected"
    };

    expect(toPersistenceStatusView(state)).toEqual({
      googleLabel: "Connected",
      driveLabel: "Connected",
      driveMessage: null,
      driveActionLabel: "Sync archive"
    });
  });

  it("keeps a Drive outage local and retryable without asking for consent", () => {
    const state: PersistenceViewState = {
      ...initialPersistenceViewState(),
      googleAccount: "connected",
      driveArchive: "temporarily_unavailable",
      driveMessage: "provider_unavailable"
    };

    expect(toPersistenceStatusView(state)).toEqual({
      googleLabel: "Connected",
      driveLabel: "Temporarily unavailable",
      driveMessage: "provider_unavailable",
      driveActionLabel: "Retry Drive archive"
    });
  });

  it("offers an explicit reconnect action only when reauthorization is required", () => {
    const state: PersistenceViewState = {
      ...initialPersistenceViewState(),
      googleAccount: "connected",
      driveArchive: "reauthorization_required"
    };

    expect(toPersistenceStatusView(state)).toMatchObject({
      googleLabel: "Connected",
      driveLabel: "Reconnect required",
      driveActionLabel: "Reconnect Google Drive"
    });
  });
});
