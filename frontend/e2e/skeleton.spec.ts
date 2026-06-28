import { expect, test } from "@playwright/test";

test("connect → list → records → query", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /demo/ }).click();
  await expect(page.getByRole("heading", { name: "demo" })).toBeVisible();
  await expect(page.getByText("alpha doc")).toBeVisible();
  await page.getByLabel(/query text/i).fill("alpha");
  await page.getByRole("button", { name: /run/i }).click();
  await expect(page.getByText(/3 hits ·/)).toBeVisible();   // all 3 demo docs returned, scored
});
