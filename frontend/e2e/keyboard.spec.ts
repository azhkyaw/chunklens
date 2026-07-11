import { expect, test } from "@playwright/test";

test("j and k move the records selection and i toggles the inspector", async ({ page }) => {
  await page.goto("/c/demo/records");
  const grid = page.getByRole("grid", { name: /records/i });
  await expect(grid).toBeVisible();
  await page.keyboard.press("j");
  await expect(grid.getByRole("row").nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("j");
  await expect(grid.getByRole("row").nth(2)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("k");
  await expect(grid.getByRole("row").nth(1)).toHaveAttribute("aria-selected", "true");
  const inspector = page.getByRole("complementary", { name: /inspector/i });
  await page.keyboard.press("i");
  await expect(inspector).not.toBeVisible();
  await page.keyboard.press("i");
  await expect(inspector).toBeVisible();
});

test("? opens the cheat sheet and Escape closes it", async ({ page }) => {
  await page.goto("/c/demo/records");
  await expect(page.getByRole("grid", { name: /records/i })).toBeVisible();
  await page.keyboard.press("?");
  const sheet = page.getByRole("dialog", { name: /keyboard shortcuts/i });
  await expect(sheet).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();
});

test("bracket keys switch tabs", async ({ page }) => {
  await page.goto("/c/demo/records");
  await expect(page.getByRole("grid", { name: /records/i })).toBeVisible();
  await page.keyboard.press("]");
  await expect(page).toHaveURL(/\/c\/demo\/query/);
  await page.keyboard.press("[");
  await expect(page).toHaveURL(/\/c\/demo\/records/);
});
