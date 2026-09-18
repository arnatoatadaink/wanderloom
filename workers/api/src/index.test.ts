import { describe, expect, it } from "vitest";

import worker, { API_WORKSPACE_READY } from "./index";

describe("api workspace", () => {
  it("loads inside the Cloudflare Vitest runtime", async () => {
    expect(API_WORKSPACE_READY).toBe(true);
    const response = worker.fetch();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
