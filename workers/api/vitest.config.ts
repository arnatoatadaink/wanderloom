import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cloudflareTest,
  readD1Migrations
} from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const projectDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(
        path.join(projectDir, "migrations")
      );

      return {
        wrangler: {
          configPath: "./wrangler.jsonc"
        },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations
          }
        }
      };
    })
  ]
});
