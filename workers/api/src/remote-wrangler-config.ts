import { DEPLOYMENT_ENVIRONMENTS } from "./deployment-environment";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface RemoteWranglerConfigInput {
  readonly stagingDatabaseId: string;
  readonly productionDatabaseId: string;
}

export interface RemoteWranglerDatabaseBinding {
  readonly binding: "DB";
  readonly database_name: string;
  readonly database_id: string;
  readonly migrations_dir: "migrations";
}

export interface RemoteWranglerEnvironment {
  readonly name: string;
  readonly d1_databases: readonly RemoteWranglerDatabaseBinding[];
}

export interface RemoteWranglerConfig {
  readonly $schema: string;
  readonly main: "src/index.ts";
  readonly compatibility_date: "2026-09-18";
  readonly env: {
    readonly staging: RemoteWranglerEnvironment;
    readonly production: RemoteWranglerEnvironment;
  };
}

function requireDatabaseId(name: string, value: string): string {
  const normalized = value.trim();
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${name} must be a non-empty D1 UUID`);
  }
  return normalized;
}

export function buildRemoteWranglerConfig(
  input: RemoteWranglerConfigInput
): RemoteWranglerConfig {
  const stagingDatabaseId = requireDatabaseId(
    "WANDERLOOM_STAGING_D1_ID",
    input.stagingDatabaseId
  );
  const productionDatabaseId = requireDatabaseId(
    "WANDERLOOM_PRODUCTION_D1_ID",
    input.productionDatabaseId
  );

  if (stagingDatabaseId === productionDatabaseId) {
    throw new Error("staging and production D1 database IDs must differ");
  }

  return {
    $schema: "../../node_modules/wrangler/config-schema.json",
    main: "src/index.ts",
    compatibility_date: "2026-09-18",
    env: {
      staging: {
        name: DEPLOYMENT_ENVIRONMENTS.staging.workerName,
        d1_databases: [
          {
            binding: "DB",
            database_name: DEPLOYMENT_ENVIRONMENTS.staging.databaseName,
            database_id: stagingDatabaseId,
            migrations_dir: "migrations"
          }
        ]
      },
      production: {
        name: DEPLOYMENT_ENVIRONMENTS.production.workerName,
        d1_databases: [
          {
            binding: "DB",
            database_name: DEPLOYMENT_ENVIRONMENTS.production.databaseName,
            database_id: productionDatabaseId,
            migrations_dir: "migrations"
          }
        ]
      }
    }
  };
}
