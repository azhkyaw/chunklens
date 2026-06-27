import { expect, test } from "@playwright/test";

test("status shows connected and a saved connection lists collections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText(/connected/i);

  await page.getByRole("button", { name: /^connection$/i }).click();
  await page.getByLabel(/host/i).fill("localhost");
  await page.getByLabel(/port/i).fill("8000");
  await page.getByRole("button", { name: /^save$/i }).click();

  await expect(page.getByRole("button", { name: /demo/ })).toBeVisible();
});
