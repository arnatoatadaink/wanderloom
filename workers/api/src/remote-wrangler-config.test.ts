import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const scriptPath = resolve(
  process.cwd(),
  "scripts/generate-remote-wrangler-config.mjs"
);

const stagingId = "11111111-1111-4111-8111-111111111111";
const productionId = "22222222-2222-4222-8222-222222222222";

describe("CP-43 remote Wrangler config generation", () => {
  it("renders isolated staging and production bindings without committing IDs", () => {
    const stdout = execFileSync(process.execPath, [scriptPath, "--stdout"], {
      encoding: "utf8",
      env: {
        ...process.env,
        WANDERLOOM_STAGING_D1_ID: stagingId,
        WANDERLOOM_PRODUCTION_D1_ID: productionId
      }
    });

    const config = JSON.parse(stdout) as {
      env: Record<string, {
        name: string;
        d1_databases: Array<{
          binding: string;
          database_name: string;
          database_id: string;
        }>;
      }>;
    };

    expect(config.env.staging.name).toBe("wanderloom-api-staging");
    expect(config.env.staging.d1_databases[0]).toMatchObject({
      binding: "DB",
      database_name: "wanderloom-staging",
      database_id: stagingId
    });
    expect(config.env.production.name).toBe("wanderloom-api");
    expect(config.env.production.d1_databases[0]).toMatchObject({
      binding: "DB",
      database_name: "wanderloom-production",
      database_id: productionId
    });
  });

  it("rejects missing or malformed D1 IDs", () => {
    const result = spawnSync(process.execPath, [scriptPath, "--stdout"], {
      encoding: "utf8",
      env: {
        ...process.env,
        WANDERLOOM_STAGING_D1_ID: "not-a-uuid",
        WANDERLOOM_PRODUCTION_D1_ID: productionId
      }
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("WANDERLOOM_STAGING_D1_ID");
  });

  it("rejects sharing one D1 database between staging and production", () => {
    const result = spawnSync(process.execPath, [scriptPath, "--stdout"], {
      encoding: "utf8",
      env: {
        ...process.env,
        WANDERLOOM_STAGING_D1_ID: stagingId,
        WANDERLOOM_PRODUCTION_D1_ID: stagingId
      }
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("must differ");
  });
});
