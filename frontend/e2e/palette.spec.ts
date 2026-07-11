import { expect, test } from "@playwright/test";

test("ctrl+k opens the palette and switches to a collection", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /open command palette/i })).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: /command palette/i });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder(/type a command/i).fill("demo");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/c\/demo\/records/);
  await expect(dialog).not.toBeVisible();
});

test("the palette navigates between tabs", async ({ page }) => {
  await page.goto("/c/demo/records");
  await expect(page.getByRole("grid", { name: /records/i })).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: /command palette/i });
  await dialog.getByPlaceholder(/type a command/i).fill("go to query");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/c\/demo\/query/);
});
