import { describe, expect, it } from "vitest";

import worker, { API_WORKSPACE_READY } from "./index";

describe("api workspace", () => {
  it("loads inside the Cloudflare Vitest runtime", async () => {
    expect(API_WORKSPACE_READY).toBe(true);

    const response = await worker.fetch(
      new Request("https://example.test/api/health"),
      {
        DB: {
          prepare() {
            throw new Error("health route must not query D1");
          },
          async batch() {
            throw new Error("health route must not query D1");
          }
        }
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
