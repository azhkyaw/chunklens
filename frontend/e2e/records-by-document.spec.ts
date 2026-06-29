import { expect, test } from "@playwright/test";

test("browse records grouped by document", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^demo\b/ }).click();
  await expect(page.getByRole("heading", { name: "demo" })).toBeVisible();

  // Records view is default; switch to By document. `demo` has no provenance key,
  // so the dropdown falls back to its first string key ("lang") and groups by it.
  await page.getByRole("tab", { name: /^by document$/i }).click();

  // A document group with a chunk count is visible; expand it and see chunks.
  const group = page.getByRole("button", { name: /chunk/i }).first();
  await expect(group).toBeVisible();
  await group.click();
  await expect(page.locator(".doc-chunks .records-table tbody tr").first()).toBeVisible();
});
