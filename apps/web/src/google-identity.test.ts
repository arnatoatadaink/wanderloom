import { describe, expect, it, vi } from "vitest";
import { BrowserGoogleIdentityBridge } from "./google-identity";

describe("CP-31 Google Identity Services bridge", () => {
  it("stays disabled without a configured client ID", async () => {
    const bridge = new BrowserGoogleIdentityBridge(null);
    expect(bridge.enabled).toBe(false);

    const callback = vi.fn();
    await expect(
      bridge.render({} as HTMLElement, "restore", callback)
    ).resolves.toBeUndefined();

    expect(callback).not.toHaveBeenCalled();
  });

  it("treats a blank client ID as disabled", () => {
    expect(new BrowserGoogleIdentityBridge("   ").enabled).toBe(false);
  });

  it("enables browser wiring when a client ID is configured", () => {
    expect(
      new BrowserGoogleIdentityBridge("google-client-id").enabled
    ).toBe(true);
  });
});
