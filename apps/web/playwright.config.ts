import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4177",
    serviceWorkers: "block",
    trace: "on",
    screenshot: "on"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 4177 --strictPort",
    // stdout readiness avoids probing an unused loopback port before Vite starts.
    wait: { stdout: /Local:.*127\.0\.0\.1:4177/ },
    reuseExistingServer: false,
    env: { VITE_GOOGLE_CLIENT_ID: "browser-fixture.apps.googleusercontent.com" }
  }
});
