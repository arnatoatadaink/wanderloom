import { describe, expect, it } from "vitest";

import { chooseArchiveAuthorizationAction } from "./archive-authorization-reuse";
import { initialPersistenceViewState } from "./persistence-state";

describe("CP-38/40 Drive authorization reuse", () => {
  it.each([
    "connected",
    "temporarily_unavailable",
    "unknown"
  ] as const)("reuses server-side authorization path when Drive state is %s", (driveArchive) => {
    expect(
      chooseArchiveAuthorizationAction({
        ...initialPersistenceViewState(),
        googleAccount: "connected",
        driveArchive
      })
    ).toBe("reuse_existing_authorization");
  });

  it.each([
    "not_connected",
    "reauthorization_required"
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
