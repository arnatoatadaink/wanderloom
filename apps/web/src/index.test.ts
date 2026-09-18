import { describe, expect, it } from "vitest";

import { WEB_WORKSPACE_READY } from "./index";

describe("web workspace", () => {
  it("loads the workspace entrypoint", () => {
    expect(WEB_WORKSPACE_READY).toBe(true);
  });
});
