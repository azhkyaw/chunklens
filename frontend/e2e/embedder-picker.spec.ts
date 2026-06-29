import { expect, test } from "@playwright/test";

test("the embedder picker appears for a non-default collection", async ({ page }) => {
  const name = "e2e_picker_col";
  await page.goto("/");

  // Create a none-EF collection (non-default) so the picker should surface.
  await page.getByRole("button", { name: /new collection/i }).click();
  await page.getByRole("textbox", { name: /^name$/i }).fill(name);
  await page.getByLabel(/embedding function/i).selectOption("none");
  await page.getByRole("button", { name: /^create$/i }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // Open the Query view and switch to Text mode (none-EF defaults to Vector).
  await page.getByRole("tab", { name: /^query$/i }).click();
  await page.getByRole("tab", { name: /^text$/i }).click();

  // The manual embedder picker is visible (we do NOT pick one - no embedding happens).
  await expect(page.getByLabel(/embed query with/i)).toBeVisible();

  // Cleanup so the suite stays idempotent.
  await page.getByRole("button", { name: /^manage$/i }).click();
  await page.getByLabel(/type the name to delete/i).fill(name);
  await page.getByRole("button", { name: /^delete$/i }).click();
  await expect(page.getByRole("button", { name: new RegExp(`^${name}\\b`) })).toHaveCount(0);
});
