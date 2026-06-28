import { expect, test } from "@playwright/test";

test("create a collection, inspect it, then delete it", async ({ page }) => {
  const name = "e2e_demo_col";
  await page.goto("/");

  await page.getByRole("button", { name: /new collection/i }).click();
  await page.getByLabel(/name/i).fill(name);
  await page.getByLabel(/embedding function/i).selectOption("none");
  await page.getByRole("button", { name: /^create$/i }).click();

  // selected automatically -> details panel shows the guard fields
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText(/Embedding function/i)).toBeVisible();

  // delete via typed confirmation
  await page.getByLabel(/type the name to delete/i).fill(name);
  await page.getByRole("button", { name: /^delete$/i }).click();

  await expect(page.getByRole("button", { name })).toHaveCount(0);
});
