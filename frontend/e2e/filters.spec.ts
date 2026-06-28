import { expect, test } from "@playwright/test";

test("build a metadata filter visually and run the query", async ({ page }) => {
  await page.goto("/");
  // CollectionsList button label is "demo (3)" - match the name, not exact text.
  await page.getByRole("button", { name: /^demo \(/ }).click();
  await expect(page.getByRole("heading", { name: "demo" })).toBeVisible();

  await page.getByLabel(/query text/i).fill("alpha");
  // Metadata filter builder is the first "add condition"
  await page.getByRole("button", { name: /add condition/i }).first().click();
  await page.getByLabel(/^field$/i).fill("lang");
  await page.getByLabel(/^value$/i).fill("en");
  // JSON preview reflects the built filter
  await expect(page.getByLabel(/Metadata filter .* JSON/i)).toContainText('{"lang":{"$eq":"en"}}');

  await page.getByRole("button", { name: /^run$/i }).click();
  // english docs a/c rank; result list shows an id line
  await expect(page.getByText(/^a -/)).toBeVisible();
});
