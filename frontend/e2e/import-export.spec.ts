import { expect, test } from "@playwright/test";

test("export a collection, then import a new one (re-embeds documents)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^demo\b/ }).click();

  // Export triggers a file download
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /^export$/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/demo\.chunklens\.json/);

  // Import lives behind the rail + menu, in a modal
  await page.getByRole("button", { name: /add collection/i }).click();
  await page.getByRole("menuitem", { name: /import collection/i }).click();
  const dialog = page.getByRole("dialog", { name: /import collection/i });

  // Import a small documents-only JSON -> default EF re-embeds on add
  const payload = {
    chunklens_export: 1,
    collection: { name: "e2e_import_col", distance_metric: "l2", embedding_function: "default", metadata: {} },
    records: [
      { id: "i1", document: "imported one" },
      { id: "i2", document: "imported two" },
    ],
  };
  await dialog.getByLabel(/import file/i).setInputFiles({
    name: "e2e_import_col.chunklens.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await expect(dialog.getByRole("textbox", { name: /^name$/i })).toHaveValue("e2e_import_col");
  await dialog.getByRole("button", { name: /^import$/i }).click();

  // New collection is created, selected, and listed
  await expect(page.getByRole("heading", { name: "e2e_import_col" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^e2e_import_col\b/ })).toBeVisible();

  // Cleanup so the suite stays idempotent: delete via the Manage modal
  await page.getByRole("button", { name: /^manage$/i }).click();
  await page.getByLabel(/type the name to delete/i).fill("e2e_import_col");
  await page.getByRole("button", { name: /^delete$/i }).click();
  await expect(page.getByRole("button", { name: /^e2e_import_col\b/ })).toHaveCount(0);
});
