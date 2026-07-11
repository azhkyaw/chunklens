import { expect, test } from "@playwright/test";

test("selecting a record shows it in the inspector with metadata and embedding", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^demo\b/ }).click();
  await expect(page.getByRole("heading", { name: "demo" })).toBeVisible();

  const inspector = page.getByRole("complementary", { name: /inspector/i });
  await expect(inspector.getByText(/select a row/i)).toBeVisible(); // idle state

  const firstRow = page.getByRole("grid", { name: /records/i }).getByRole("row").nth(1); // 0 = header
  const id = (await firstRow.getByRole("gridcell").first().innerText()).trim();
  await firstRow.click();

  await expect(inspector.getByText(id, { exact: true })).toBeVisible();
  await expect(inspector.getByText(/^dim \d+$/)).toBeVisible();   // embedding preview loaded
  await expect(page).toHaveURL(new RegExp(`sel=${id}`));

  // Metadata is editable from the inspector.
  await expect(inspector.getByRole("button", { name: /^edit$/i })).toBeVisible();
});

test("a sel deep link restores the selection after reload", async ({ page }) => {
  await page.goto("/c/demo/records");
  const firstRow = page.getByRole("grid", { name: /records/i }).getByRole("row").nth(1);
  const id = (await firstRow.getByRole("gridcell").first().innerText()).trim();

  await page.goto(`/c/demo/records?sel=${encodeURIComponent(id)}`);
  const inspector = page.getByRole("complementary", { name: /inspector/i });
  await expect(inspector.getByText(id, { exact: true })).toBeVisible();
  // The deep-linked id is the first data row (captured as nth(1) above), so assert
  // aria-selected on that row directly. Matching by a raw-id regex would match every
  // row when the id is a single letter like "a" (present in alpha/gamma/Metadata).
  await expect(
    page.getByRole("grid", { name: /records/i }).getByRole("row").nth(1),
  ).toHaveAttribute("aria-selected", "true");
});

test("the inspector collapses to a strip and reopens", async ({ page }) => {
  await page.goto("/c/demo/records");
  await expect(page.getByRole("complementary", { name: /inspector/i })).toBeVisible();
  await page.getByRole("button", { name: /close inspector/i }).click();
  await expect(page.getByRole("complementary", { name: /inspector/i })).not.toBeVisible();
  await page.getByRole("button", { name: /open inspector/i }).click();
  await expect(page.getByRole("complementary", { name: /inspector/i })).toBeVisible();
});
