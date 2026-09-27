import { describe, expect, it } from "vitest";

import { buildRemoteWranglerConfig } from "./remote-wrangler-config";

const stagingId = "11111111-1111-4111-8111-111111111111";
const productionId = "22222222-2222-4222-8222-222222222222";

describe("CP-43 remote Wrangler config generation", () => {
  it("renders isolated staging and production bindings without committing IDs", () => {
    const config = buildRemoteWranglerConfig({
      stagingDatabaseId: stagingId,
      productionDatabaseId: productionId
    });

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
    expect(() =>
      buildRemoteWranglerConfig({
        stagingDatabaseId: "not-a-uuid",
        productionDatabaseId: productionId
      })
    ).toThrow("WANDERLOOM_STAGING_D1_ID");
  });

  it("rejects sharing one D1 database between staging and production", () => {
    expect(() =>
      buildRemoteWranglerConfig({
        stagingDatabaseId: stagingId,
        productionDatabaseId: stagingId
      })
    ).toThrow("must differ");
  });
});
