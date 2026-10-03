import { expect, test } from "@playwright/test";

import { ProductionZoneFixture } from "./production-zone-fixture";

test("Wayfarer success unlocks Mossglass and allows the next expedition", async ({ page }) => {
  const fixture = new ProductionZoneFixture(page);
  await fixture.install();

  await page.goto("/");

  const wayfarer = page.locator('[data-zone-id="wayfarer-meadow"]');
  const mossglass = page.locator('[data-zone-id="mossglass-grove"]');

  await expect(wayfarer).toBeEnabled();
  await expect(wayfarer).toContainText("Rank 0");
  await expect(mossglass).toBeDisabled();
  await expect(mossglass).toContainText("Rank 1");
  await expect(mossglass).toContainText("Locked");
  await expect(page.locator('[data-zone-id="shattered-causeway"]')).toBeDisabled();
  await expect(page.locator('[data-zone-id="ashwind-highlands"]')).toBeDisabled();
  await expect(page.locator('[data-zone-id="starfall-frontier"]')).toBeDisabled();

  expect(fixture.count("/api/zones")).toBe(1);

  await page.getByRole("button", { name: "Start expedition" }).click();
  await expect(page.getByRole("button", { name: "Claim rewards" })).toBeEnabled();
  await page.getByRole("button", { name: "Claim rewards" }).click();

  await expect(page.getByText("Success", { exact: true })).toBeVisible();
  expect(fixture.zoneRank).toBe(1);
  expect(fixture.count("/api/zones")).toBe(2);

  await page.getByRole("button", { name: "Explore again" }).click();

  await expect(mossglass).toBeEnabled();
  await expect(mossglass).toContainText("Rank 1");
  await expect(mossglass).not.toContainText("Locked");

  await mossglass.click();
  await expect(mossglass).toHaveClass(/selected/);
  await page.getByRole("button", { name: "Start expedition" }).click();

  await expect(page.getByText("mossglass-grove", { exact: true })).toBeVisible();
  expect(fixture.count("/api/explorations", "POST")).toBe(2);

  fixture.assertClean();
});
