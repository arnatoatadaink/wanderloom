import { describe, expect, it } from "vitest";

import {
  DEPLOYMENT_ENVIRONMENTS,
  validateDeploymentEnvironmentModel
} from "./deployment-environment";

describe("CP-43 deployment environment model", () => {
  it("keeps local, staging and production resource names distinct", () => {
    expect(validateDeploymentEnvironmentModel()).toEqual([]);
    expect(DEPLOYMENT_ENVIRONMENTS.local.databaseName).toBe("wanderloom-local");
    expect(DEPLOYMENT_ENVIRONMENTS.staging.databaseName).toBe("wanderloom-staging");
    expect(DEPLOYMENT_ENVIRONMENTS.production.databaseName).toBe("wanderloom-production");
    expect(DEPLOYMENT_ENVIRONMENTS.staging.workerName).not.toBe(
      DEPLOYMENT_ENVIRONMENTS.production.workerName
    );
  });

  it("requires different remote D1 database ids", () => {
    expect(
      validateDeploymentEnvironmentModel({
        stagingDatabaseId: "staging-id",
        productionDatabaseId: "production-id"
      })
    ).toEqual([]);

    expect(
      validateDeploymentEnvironmentModel({
        stagingDatabaseId: "same-id",
        productionDatabaseId: "same-id"
      })
    ).toContain("staging_and_production_database_ids_must_differ");
  });

  it("rejects missing remote resource ids when validating provisioned targets", () => {
    expect(
      validateDeploymentEnvironmentModel({
        stagingDatabaseId: "",
        productionDatabaseId: "production-id"
      })
    ).toContain("staging_database_id_required");

    expect(
      validateDeploymentEnvironmentModel({
        stagingDatabaseId: "staging-id",
        productionDatabaseId: " "
      })
    ).toContain("production_database_id_required");
  });
});
