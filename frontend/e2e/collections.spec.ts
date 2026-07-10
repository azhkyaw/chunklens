import { expect, test } from "@playwright/test";

test("create a collection, inspect it, then delete it", async ({ page }) => {
  const name = "e2e_demo_col";
  await page.goto("/");

  await page.getByRole("button", { name: /add collection/i }).click();
  await page.getByRole("menuitem", { name: /new collection/i }).click();
  const dialog = page.getByRole("dialog", { name: /new collection/i });
  await dialog.getByLabel(/name/i).fill(name);
  await dialog.getByLabel(/embedding function/i).selectOption("none");
  await dialog.getByRole("button", { name: /^create$/i }).click();

  // created -> routed to /c/<name>/records with the details plate visible
  await expect(page).toHaveURL(new RegExp(`/c/${name}/records$`));
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText(/Embedding fn/i)).toBeVisible();

  // rename/metadata/delete live in the "Manage" modal
  await page.getByRole("button", { name: /^manage$/i }).click();

  // delete via typed confirmation
  await page.getByLabel(/type the name to delete/i).fill(name);
  await page.getByRole("button", { name: /^delete$/i }).click();

  await expect(page.getByRole("button", { name })).toHaveCount(0);
});
