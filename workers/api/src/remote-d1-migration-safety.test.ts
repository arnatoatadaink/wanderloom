import { describe, expect, it } from "vitest";

import {
  getRemoteMigrationPlan,
  validateRemoteMigrationApply
} from "./remote-d1-migration-safety";

describe("CP-44 remote D1 migration safety", () => {
  it("uses immutable database names and explicit remote environments", () => {
    const staging = getRemoteMigrationPlan("staging");
    const production = getRemoteMigrationPlan("production");

    expect(staging.databaseName).toBe("wanderloom-staging");
    expect(production.databaseName).toBe("wanderloom-production");
    expect(staging.databaseName).not.toBe(production.databaseName);

    expect(staging.listArgs).toEqual([
      "d1",
      "migrations",
      "list",
      "wanderloom-staging",
      "--remote",
      "--config",
      ".wrangler/remote/wrangler.remote.json",
      "--env",
      "staging"
    ]);

    expect(production.applyArgs).toEqual([
      "d1",
      "migrations",
      "apply",
      "wanderloom-production",
      "--remote",
      "--config",
      ".wrangler/remote/wrangler.remote.json",
      "--env",
      "production"
    ]);
  });

  it("requires an exact target-specific confirmation before apply", () => {
    expect(validateRemoteMigrationApply("staging", undefined)).toEqual([
      "remote_migration_confirmation_required"
    ]);
    expect(validateRemoteMigrationApply("staging", "APPLY wanderloom-production")).toEqual([
      "remote_migration_confirmation_mismatch"
    ]);
    expect(validateRemoteMigrationApply("staging", "APPLY wanderloom-staging")).toEqual([]);
  });

  it("does not allow production confirmation to authorize staging or vice versa", () => {
    expect(validateRemoteMigrationApply("production", "APPLY wanderloom-staging")).toEqual([
      "remote_migration_confirmation_mismatch"
    ]);
    expect(validateRemoteMigrationApply("production", "APPLY wanderloom-production")).toEqual([]);
  });
});
