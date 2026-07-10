import { expect, test } from "@playwright/test";

test("the topbar pill shows connected and a saved connection lists collections", async ({ page }) => {
  await page.goto("/");
  const pill = page.getByRole("button", { name: /\bconnected\b/i });
  await expect(pill).toBeVisible();

  await pill.click();
  const dialog = page.getByRole("dialog", { name: /connection settings/i });
  await dialog.getByLabel(/host/i).fill("localhost");
  await dialog.getByLabel(/port/i).fill("8000");
  await dialog.getByRole("button", { name: /^connect$/i }).click();

  await expect(page.getByRole("button", { name: /demo/ })).toBeVisible();
});
