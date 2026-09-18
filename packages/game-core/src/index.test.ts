import { describe, expect, it } from "vitest";

import { GAME_CORE_WORKSPACE_READY } from "./index";

describe("game-core workspace", () => {
  it("loads the pure domain package entrypoint", () => {
    expect(GAME_CORE_WORKSPACE_READY).toBe(true);
  });
});
