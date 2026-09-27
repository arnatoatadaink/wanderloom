import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const config = {
  $schema: "../../node_modules/wrangler/config-schema.json",
  main: "src/index.ts",
  compatibility_date: "2026-09-18",
  env: {
    staging: {
      name: "wanderloom-api-staging",
      d1_databases: [
        {
          binding: "DB",
          database_name: "wanderloom-staging",
          database_id: stagingDatabaseId,
          migrations_dir: "migrations"
        }
      ]
    },
    production: {
      name: "wanderloom-api",
      d1_databases: [
        {
          binding: "DB",
          database_name: "wanderloom-production",
          database_id: productionDatabaseId,
          migrations_dir: "migrations"
        }
      ]
    }
  }
};

const output = `${JSON.stringify(config, null, 2)}\n`;

if (process.argv.includes("--stdout")) {
  process.stdout.write(output);
} else {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const outputPath = resolve(scriptDir, "../.wrangler/remote/wrangler.remote.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
  process.stdout.write(`${outputPath}\n`);
}
