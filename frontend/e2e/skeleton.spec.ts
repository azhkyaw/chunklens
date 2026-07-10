import { expect, test } from "@playwright/test";

test("connect → list → records → query", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /demo/ }).click();
  await expect(page).toHaveURL(/\/c\/demo\/records$/);
  await expect(page.getByRole("heading", { name: "demo" })).toBeVisible();
  await expect(page.getByText("alpha doc")).toBeVisible();
  await page.getByRole("tab", { name: /^query$/i }).click();
  await expect(page).toHaveURL(/\/c\/demo\/query$/);
  await page.getByLabel(/query text/i).fill("alpha");
  await page.getByRole("button", { name: /run/i }).click();
  await expect(page.getByText(/3 hits ·/)).toBeVisible();   // all 3 demo docs returned, scored
});

test("a deep link straight to a collection tab survives refresh", async ({ page }) => {
  await page.goto("/c/demo/query");                          // served by the SPA fallback
  await expect(page.getByLabel(/query text/i)).toBeVisible();
  await expect(page.getByRole("tab", { name: /^query$/i })).toHaveAttribute("aria-selected", "true");
});
