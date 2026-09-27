import { describe, expect, it } from "vitest";

import {
  PUBLIC_WEB_BUILD_VARIABLES,
  REQUIRED_WORKER_SECRETS,
  expectedWorkerSecretListCommand,
  expectedWorkerSecretPutCommands,
  validateListedWorkerSecrets,
  validateProvisioningPresence
} from "./configuration-provisioning";

describe("CP-45 configuration provisioning", () => {
  it("fixes the Worker secret and public web variable inventory", () => {
    expect(REQUIRED_WORKER_SECRETS).toEqual([
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "ARCHIVE_TOKEN_ENCRYPTION_KEY"
    ]);
    expect(PUBLIC_WEB_BUILD_VARIABLES).toEqual(["VITE_GOOGLE_CLIENT_ID"]);
  });

  it("fails closed when required deployment configuration is absent", () => {
    expect(
      validateProvisioningPresence({
        workerSecrets: {
          GOOGLE_CLIENT_ID: "client-id",
          GOOGLE_CLIENT_SECRET: "",
          ARCHIVE_TOKEN_ENCRYPTION_KEY: "key"
        },
        webBuildVariables: {
          VITE_GOOGLE_CLIENT_ID: undefined
        }
      })
    ).toEqual([
      "missing_worker_secret:GOOGLE_CLIENT_SECRET",
      "missing_web_build_variable:VITE_GOOGLE_CLIENT_ID"
    ]);
  });

  it("validates only remote secret names and never requires secret values", () => {
    expect(
      validateListedWorkerSecrets([
        "GOOGLE_CLIENT_ID",
        "ARCHIVE_TOKEN_ENCRYPTION_KEY"
      ])
    ).toEqual(["missing_remote_worker_secret:GOOGLE_CLIENT_SECRET"]);

    expect(validateListedWorkerSecrets([...REQUIRED_WORKER_SECRETS])).toEqual([]);
  });

  it("keeps staging and production secret operations explicitly targeted", () => {
    expect(expectedWorkerSecretPutCommands("staging")[0]).toEqual([
      "wrangler",
      "secret",
      "put",
      "GOOGLE_CLIENT_ID",
      "--env",
      "staging",
      "--config",
      ".wrangler/remote/wrangler.remote.json"
    ]);
    expect(expectedWorkerSecretListCommand("production")).toEqual([
      "wrangler",
      "secret",
      "list",
      "--format",
      "json",
      "--env",
      "production",
      "--config",
      ".wrangler/remote/wrangler.remote.json"
    ]);
  });
});
