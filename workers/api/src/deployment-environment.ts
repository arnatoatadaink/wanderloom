export type DeploymentEnvironmentName = "local" | "staging" | "production";

export interface DeploymentEnvironmentDefinition {
  readonly environment: DeploymentEnvironmentName;
  readonly workerName: string;
  readonly databaseName: string;
  readonly remote: boolean;
}

export const DEPLOYMENT_ENVIRONMENTS: Readonly<
  Record<DeploymentEnvironmentName, DeploymentEnvironmentDefinition>
> = {
  local: {
    environment: "local",
    workerName: "wanderloom-api-local",
    databaseName: "wanderloom-local",
    remote: false
  },
  staging: {
    environment: "staging",
    workerName: "wanderloom-api-staging",
    databaseName: "wanderloom-staging",
    remote: true
  },
  production: {
    environment: "production",
    workerName: "wanderloom-api",
    databaseName: "wanderloom-production",
    remote: true
  }
};

export interface RemoteDeploymentResourceIds {
  readonly stagingDatabaseId: string;
  readonly productionDatabaseId: string;
}

export function validateDeploymentEnvironmentModel(
  resourceIds?: RemoteDeploymentResourceIds
): readonly string[] {
  const problems: string[] = [];
  const definitions = Object.values(DEPLOYMENT_ENVIRONMENTS);

  const workerNames = definitions.map((entry) => entry.workerName);
  if (new Set(workerNames).size !== workerNames.length) {
    problems.push("deployment_worker_names_must_be_unique");
  }

  const databaseNames = definitions.map((entry) => entry.databaseName);
  if (new Set(databaseNames).size !== databaseNames.length) {
    problems.push("deployment_database_names_must_be_unique");
  }

  if (DEPLOYMENT_ENVIRONMENTS.local.remote) {
    problems.push("local_environment_must_not_be_remote");
  }

  if (!DEPLOYMENT_ENVIRONMENTS.staging.remote) {
    problems.push("staging_environment_must_be_remote");
  }

  if (!DEPLOYMENT_ENVIRONMENTS.production.remote) {
    problems.push("production_environment_must_be_remote");
  }

  if (resourceIds !== undefined) {
    const stagingDatabaseId = resourceIds.stagingDatabaseId.trim();
    const productionDatabaseId = resourceIds.productionDatabaseId.trim();

    if (stagingDatabaseId.length === 0) {
      problems.push("staging_database_id_required");
    }
    if (productionDatabaseId.length === 0) {
      problems.push("production_database_id_required");
    }
    if (
      stagingDatabaseId.length > 0 &&
      productionDatabaseId.length > 0 &&
      stagingDatabaseId === productionDatabaseId
    ) {
      problems.push("staging_and_production_database_ids_must_differ");
    }
  }

  return problems;
}
