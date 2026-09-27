import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIRED_WORKER_SECRETS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ARCHIVE_TOKEN_ENCRYPTION_KEY"
];

function requireDatabaseId(name) {
  const value = process.env[name]?.trim() ?? "";
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${name} must be a non-empty D1 UUID`);
  }
  return value;
}

const stagingDatabaseId = requireDatabaseId("WANDERLOOM_STAGING_D1_ID");
const productionDatabaseId = requireDatabaseId("WANDERLOOM_PRODUCTION_D1_ID");

if (stagingDatabaseId === productionDatabaseId) {
  throw new Error("staging and production D1 database IDs must differ");
}

const bootstrap = process.argv.includes("--bootstrap");

function environmentConfig(name, databaseName, databaseId) {
  const config = {
    name,
    d1_databases: [
      {
        binding: "DB",
        database_name: databaseName,
        database_id: databaseId,
        migrations_dir: "migrations"
      }
    ]
  };

  if (!bootstrap) {
    config.secrets = {
      required: REQUIRED_WORKER_SECRETS
    };
  }

  return config;
}

const config = {
  $schema: "../../node_modules/wrangler/config-schema.json",
  main: "src/index.ts",
  compatibility_date: "2026-09-18",
  env: {
    staging: environmentConfig(
      "wanderloom-api-staging",
      "wanderloom-staging",
      stagingDatabaseId
    ),
    production: environmentConfig(
      "wanderloom-api",
      "wanderloom-production",
      productionDatabaseId
    )
  }
};

const output = `${JSON.stringify(config, null, 2)}\n`;

if (process.argv.includes("--stdout")) {
  process.stdout.write(output);
} else {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const filename = bootstrap
    ? "wrangler.bootstrap.json"
    : "wrangler.remote.json";
  const outputPath = resolve(scriptDir, `../.wrangler/remote/${filename}`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
  process.stdout.write(`${outputPath}\n`);
}
