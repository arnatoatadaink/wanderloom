import { describe, expect, it } from "vitest";

import {
  getWorkerDeploymentCommands,
  validateReleaseIdentity
} from "./deployment-runbook";

describe("CP-46 deployment runbook contract", () => {
  it("keeps staging and production deploy commands explicitly targeted", () => {
    expect(getWorkerDeploymentCommands("staging").deploy).toEqual([
      "wrangler",
      "deploy",
      "--env",
      "staging",
      "--config",
      ".wrangler/remote/wrangler.remote.json"
    ]);
    expect(getWorkerDeploymentCommands("production").listDeployments).toEqual([
      "wrangler",
      "deployments",
      "list",
      "--json",
      "--env",
      "production",
      "--config",
      ".wrangler/remote/wrangler.remote.json"
    ]);
  });

  it("requires an explicit Worker version ID for rollback", () => {
    const commands = getWorkerDeploymentCommands("staging");
    expect(() => commands.rollback(" ")).toThrow("version ID");
    expect(commands.rollback("version-123")).toEqual([
      "wrangler",
      "rollback",
      "version-123",
      "--message",
      "rollback staging to version-123",
      "--env",
      "staging",
      "--config",
      ".wrangler/remote/wrangler.remote.json"
    ]);
  });

  it("requires full source identity before release recording", () => {
    expect(
      validateReleaseIdentity({
        commitSha: "7c0581478c9056d91836280dd2ca1473f977346c",
        tag: null
      })
    ).toEqual([]);
    expect(
      validateReleaseIdentity({ commitSha: "7c05814", tag: "v0.0.5" })
    ).toEqual(["release_commit_sha_must_be_full_40_hex"]);
    expect(
      validateReleaseIdentity({
        commitSha: "7c0581478c9056d91836280dd2ca1473f977346c",
        tag: ""
      })
    ).toEqual(["release_tag_must_be_nonempty_when_present"]);
  });
});
