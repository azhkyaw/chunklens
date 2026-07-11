import { expect, test } from "@playwright/test";

test("a query shows its latency in the results header and the status bar", async ({ page }) => {
  await page.goto("/c/demo/query");
  await page.getByLabel(/query text/i).fill("how do embeddings work");
  await page.getByRole("button", { name: /^run$/i }).click();
  await expect(page.getByText(/\d+ hits · \d+ ms ·/)).toBeVisible();
  await expect(page.getByText(/last query \d+ ms/)).toBeVisible();
});

test("the palette toggles compact density and it persists across reload", async ({ page }) => {
  await page.goto("/c/demo/records");
  await expect(page.getByRole("grid", { name: /records/i })).toBeVisible();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: /command palette/i });
  await dialog.getByPlaceholder(/type a command/i).fill("density");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
});

test("a run lands in the palette history and re-runs from another tab", async ({ page }) => {
  await page.goto("/c/demo/query");
  await page.getByLabel(/query text/i).fill("chunk overlap");
  await page.getByRole("button", { name: /^run$/i }).click();
  await expect(page.getByText(/\d+ hits ·/)).toBeVisible();
  await page.getByRole("tab", { name: /^records$/i }).click();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: /command palette/i });
  await dialog.getByPlaceholder(/type a command/i).fill("chunk overlap");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/c\/demo\/query/);
  await expect(page.getByText(/\d+ hits · \d+ ms ·/)).toBeVisible();
});

test("the inspector copies a runnable Python snippet and shows raw JSON", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/c/demo/records");
  const grid = page.getByRole("grid", { name: /records/i });
  await grid.getByRole("row").nth(1).click();
  const inspector = page.getByRole("complementary", { name: /inspector/i });
  await inspector.getByRole("button", { name: /copy as python/i }).click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain("chromadb.HttpClient");
  expect(clip).toContain("collection.get(ids=");
  await inspector.getByRole("button", { name: /^raw json$/i }).click();
  await expect(page.getByTestId("inspector-raw")).toContainText('"id"');
});
