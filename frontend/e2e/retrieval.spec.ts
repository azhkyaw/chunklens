import { test, expect } from "@playwright/test";

test("scores a query, reveals provenance, then compares two queries", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^demo\b/ }).click();

  // Single query: run, see scored results, expand the top hit
  await page.getByRole("tab", { name: /^query$/i }).click();
  await page.getByLabel(/query text/i).fill("the quick brown fox");
  await page.getByRole("button", { name: /^run$/i }).click();
  await expect(page.getByText(/\d+ hits ·/)).toBeVisible();     // metric-aware results rendered
  const results = page.locator("ol").last();                    // the results list
  await results.getByRole("button").first().click();            // expand the top hit
  await expect(results.getByText("lang")).toBeVisible();        // demo records carry a `lang` metadata key

  // Compare mode: run both, see both panels
  await page.getByRole("tab", { name: /^compare$/i }).click();
  await expect(page).toHaveURL(/\/c\/demo\/compare$/);
  const texts = page.getByLabel(/query text/i);
  await texts.nth(0).fill("the quick brown fox");
  await texts.nth(1).fill("lazy dog");
  await page.getByRole("button", { name: /run both/i }).click();
  await expect(page.getByText("Query A")).toBeVisible();
  await expect(page.getByText("Query B")).toBeVisible();
});
