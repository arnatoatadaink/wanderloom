import { describe, expect, it } from "vitest";

import {
  POST_DEPLOY_SMOKE_STEPS,
  evaluatePostDeploySmoke,
  migrationStateCommand,
  requireAbsoluteBaseUrl
} from "./post-deploy-smoke";

describe("CP-47 post-deploy smoke contract", () => {
  it("requires the complete release-blocking smoke sequence", () => {
    expect(POST_DEPLOY_SMOKE_STEPS.map((step) => step.name)).toEqual([
      "health",
      "guest_bootstrap",
      "state",
      "inventory",
      "zones",
      "exploration_start",
      "exploration_claim",
      "migration_state"
    ]);
    expect(POST_DEPLOY_SMOKE_STEPS.every((step) => step.releaseBlocking)).toBe(true);
    expect(
      POST_DEPLOY_SMOKE_STEPS.find((step) => step.name === "exploration_claim")?.phase
    ).toBe("delayed");
  });

  it("fails closed for missing or failed smoke evidence", () => {
    expect(
      evaluatePostDeploySmoke([
        { name: "health", ok: true },
        { name: "guest_bootstrap", ok: true },
        { name: "state", ok: false }
      ])
    ).toContain("smoke_failed:state");
    expect(
      evaluatePostDeploySmoke([{ name: "health", ok: true }])
    ).toContain("missing_smoke_result:exploration_claim");
  });

  it("keeps migration verification target-specific and remote URLs safe", () => {
    expect(migrationStateCommand("staging")).toEqual([
      "pnpm",
      "--filter",
      "@wanderloom/api",
      "migrate:remote",
      "--",
      "--target",
      "staging"
    ]);
    expect(requireAbsoluteBaseUrl("https://staging.example.test").origin).toBe(
      "https://staging.example.test"
    );
    expect(() => requireAbsoluteBaseUrl("http://staging.example.test")).toThrow(
      "HTTPS"
    );
    expect(() => requireAbsoluteBaseUrl("https://user:secret@example.test")).toThrow(
      "credentials"
    );
  });
});
