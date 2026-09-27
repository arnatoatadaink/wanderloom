import { describe, expect, it } from "vitest";

import { chooseArchiveAuthorizationAction } from "./archive-authorization-reuse";
import { initialPersistenceViewState } from "./persistence-state";

describe("CP-38 existing Drive authorization reuse", () => {
  it("reuses existing authorization when Drive is connected", () => {
    expect(
      chooseArchiveAuthorizationAction({
        ...initialPersistenceViewState(),
        googleAccount: "connected",
        driveArchive: "connected"
      })
    ).toBe("reuse_existing_authorization");
  });

  it.each([
    "unknown",
    "not_connected",
    "reauthorization_required",
    "temporarily_unavailable"
  ] as const)("requests authorization when Drive state is %s", (driveArchive) => {
    expect(
      chooseArchiveAuthorizationAction({
        ...initialPersistenceViewState(),
        googleAccount: "connected",
        driveArchive
      })
    ).toBe("request_authorization");
  });
});
