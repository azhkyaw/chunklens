import { test, expect } from "@playwright/test";

test("scores a query, reveals provenance, then compares two queries", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^demo\b/ }).click();

  // Single query: run, see scored results, select the top hit into the inspector
  await page.getByRole("tab", { name: /^query$/i }).click();
  await page.getByLabel(/query text/i).fill("the quick brown fox");
  await page.getByRole("button", { name: /^run$/i }).click();
  await expect(page.getByText(/\d+ hits ·/)).toBeVisible();     // metric-aware results rendered
  const results = page.getByRole("listbox", { name: /^results$/i });
  await results.getByRole("button").first().click();            // select the top hit
  const inspector = page.getByRole("complementary", { name: /inspector/i });
  await expect(inspector.getByText("lang")).toBeVisible();      // hit metadata shows in the inspector
  await expect(inspector.getByText(/^#1$/)).toBeVisible();      // with its rank

  // Compare mode: run both, see both panels
  await page.getByRole("tab", { name: /^compare$/i }).click();
  await expect(page).toHaveURL(/\/c\/demo\/compare$/);
  const texts = page.getByLabel(/query text/i);
  await texts.nth(0).fill("the quick brown fox");
  await texts.nth(1).fill("lazy dog");
  await page.getByRole("button", { name: /run both/i }).click();
  // Compare fires TWO queries at once, and a default-EF collection embeds each
  // one server-side through ONNX. In a full-suite run that pair regularly takes
  // longer than Playwright's 5s default assertion budget (a single query alone
  // has been measured at ~4.6s here), so the default budget makes this spec flaky
  // in suite order while it passes in isolation. The app is correct throughout:
  // Run both stays disabled and the Running queries skeleton shows. Give the
  // slow backend room rather than pretending the UI is at fault.
  const COMPARE_READY = 25_000;
  await expect(page.getByText("Query A")).toBeVisible({ timeout: COMPARE_READY });
  await expect(page.getByText("Query B")).toBeVisible({ timeout: COMPARE_READY });
});
