import { expect, test } from "@playwright/test";
import { M4Fixture, type SyncOutcome } from "./m4-fixture";

test("claim remains committed while Drive is pending and after Drive failure", async ({ page }) => {
  const fixture = new M4Fixture(page);
  fixture.instantExploration = true;
  fixture.syncOutcomes = [503];
  fixture.holdNextSync();
  await fixture.install();
  await page.goto("/");
  // The rendered Connected state proves the status response reached the app.
  await expect(page.getByText("Drive archive: Connected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start expedition", exact: true }).click();
  await page.getByRole("button", { name: "Claim rewards", exact: true }).click();
  await expect.poll(() => fixture.count("/api/archive/sync")).toBe(1);
  await expect(page.getByRole("heading", { name: "Success", exact: true })).toBeVisible();
  await expect(page.getByLabel("Player metrics")).toHaveText("Lv 1 125 G 22 XP");
  await expect(page.locator(".reward-grid")).toContainText("+25");
  await expect(page.locator(".reward-grid")).toContainText("+12");
  await expect(page.getByText("M4 Browser Charm", { exact: true })).toBeVisible();
  // A real equipment click succeeds before Drive is even allowed to respond.
  await page.getByRole("button", { name: "Equip", exact: true }).click();
  await expect(page.getByRole("button", { name: "Equipped", exact: true })).toBeDisabled();
  const failedSync = page.waitForResponse((response) => response.url().endsWith("/api/archive/sync") && response.status() === 503);
  fixture.releaseHeldSync();
  await failedSync;
  await expect.poll(() => fixture.count("/api/archive/google/status", "GET")).toBe(2);
  await expect(page.getByRole("heading", { name: "Success", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Could not continue" })).toHaveCount(0);
  await page.getByRole("button", { name: "Explore again", exact: true }).click();
  fixture.instantExploration = false;
  await page.getByRole("button", { name: "Start expedition", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Out in the wild", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Out in the wild", exact: true })).toBeVisible();
  await expect(page.getByLabel("Player metrics")).toHaveText("Lv 1 125 G 22 XP");
  expect(fixture.count("/api/equipment")).toBe(1);
  expect(fixture.count("/api/explorations")).toBe(2);
  expect(await fixture.oauthCount()).toBe(0);
  fixture.assertClean();
});

for (const outcome of ["network", 429, 503] satisfies SyncOutcome[]) {
  test(`transient ${outcome} failure retries without reconnect or consent`, async ({ page }) => {
    const fixture = new M4Fixture(page);
    fixture.syncOutcomes = [outcome, "success"];
    await fixture.install();
    await page.goto("/");
    await expect(page.getByText("Drive archive: Connected", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Sync archive", exact: true }).click();
    await expect(page.getByText(/^Drive archive unavailable:/)).toBeVisible();
    await expect(page.getByText("Drive archive: Connected", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reconnect Google Drive" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Start expedition", exact: true })).toBeEnabled();
    expect(await fixture.oauthCount()).toBe(0);
    // Also exercise a status-read failure: the local Retry action must reuse consent.
    fixture.statusFailures = 1;
    await page.reload();
    await expect(page.getByText("Drive archive: Temporarily unavailable", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Retry Drive archive", exact: true }).click();
    await expect(page.getByText("Archive sync complete: 1 synced, 0 failed.", { exact: true })).toBeVisible();
    await expect(page.getByText("Drive archive: Connected", { exact: true })).toBeVisible();
    expect(fixture.count("/api/archive/sync")).toBe(2);
    expect(fixture.count("/api/archive/google/authorize")).toBe(0);
    expect(await fixture.oauthCount()).toBe(0);
    await page.getByRole("button", { name: "Start expedition", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Out in the wild", exact: true })).toBeVisible();
    fixture.assertClean();
  });
}

test("persisted reconnect-required waits for an explicit action after reload and claim", async ({ page }) => {
  const fixture = new M4Fixture(page);
  fixture.driveState = "reauthorization_required";
  fixture.instantExploration = true;
  await fixture.install();
  await page.goto("/");
  await expect(page.getByText("Drive archive: Reconnect required", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Reconnect Google Drive", exact: true })).toBeEnabled();
  expect(await fixture.oauthCount()).toBe(0);
  await page.getByRole("button", { name: "Start expedition", exact: true }).click();
  await page.getByRole("button", { name: "Claim rewards", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Success", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Explore again", exact: true }).click();
  await expect(page.getByText("Drive archive: Reconnect required", { exact: true })).toBeVisible();
  expect(fixture.count("/api/archive/sync")).toBe(0);
  expect(fixture.count("/api/archive/google/authorize")).toBe(0);
  expect(await fixture.oauthCount()).toBe(0);
  await page.getByRole("button", { name: "Reconnect Google Drive", exact: true }).click();
  await expect(page.getByText("Archive sync complete: 1 synced, 0 failed.", { exact: true })).toBeVisible();
  await expect(page.getByText("Drive archive: Connected", { exact: true })).toBeVisible();
  expect(await fixture.oauthCount()).toBe(1);
  expect(fixture.count("/api/archive/google/authorize")).toBe(1);
  expect(fixture.count("/api/archive/sync")).toBe(1);
  fixture.assertClean();
});

test("popup cancellation stays local and explicit retry succeeds", async ({ page }) => {
  const fixture = new M4Fixture(page);
  fixture.driveState = "reauthorization_required";
  fixture.instantExploration = true;
  await fixture.install();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Reconnect Google Drive", exact: true })).toBeEnabled();
  await fixture.setPopupOutcome("cancel");
  await page.getByRole("button", { name: "Reconnect Google Drive", exact: true }).click();
  await expect(page.getByText("Drive archive unavailable: Google Drive authorization popup failed: popup_closed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reconnect Google Drive", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Start expedition", exact: true })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Could not continue" })).toHaveCount(0);
  expect(await fixture.oauthCount()).toBe(1);
  expect(fixture.count("/api/archive/google/authorize")).toBe(0);
  expect(fixture.count("/api/archive/sync")).toBe(0);
  // Confirm gameplay actually works after cancellation, then retry reconnect.
  await page.getByRole("button", { name: "Start expedition", exact: true }).click();
  await page.getByRole("button", { name: "Claim rewards", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Success", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Explore again", exact: true }).click();
  await fixture.setPopupOutcome("success");
  await page.getByRole("button", { name: "Reconnect Google Drive", exact: true }).click();
  await expect(page.getByText("Archive sync complete: 1 synced, 0 failed.", { exact: true })).toBeVisible();
  expect(await fixture.oauthCount()).toBe(2);
  expect(fixture.count("/api/archive/google/authorize")).toBe(1);
  expect(fixture.count("/api/archive/sync")).toBe(1);
  await expect(page.getByLabel("Player metrics")).toHaveText("Lv 1 125 G 22 XP");
  fixture.assertClean();
});
