import { expect, test } from "@playwright/test";

// The onboarding toast fires once per fresh browser context. It is asserted
// on purpose in its own spec below; every other spec here pre-sets the flag
// so a floating toast cannot overlap the elements under test.

test("zero hits shows the designed empty state and keeps the latency readout", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chunklens:onboarded", "1"));
  await page.goto("/c/demo/query");
  await page.getByLabel(/query text/i).fill("alpha");

  // A metadata filter that matches nothing: the demo seed only has lang en/fr.
  await page.getByRole("button", { name: /add condition/i }).first().click();
  await page.getByLabel(/^field$/i).fill("lang");
  await page.getByLabel(/^value$/i).fill("no-such-lang");

  await page.getByRole("button", { name: /^run$/i }).click();

  // The header survives a zero-hit result, so the latency readout still lands.
  await expect(page.getByText(/0 hits · \d+ ms/)).toBeVisible();
  await expect(page.getByText("nothing matched")).toBeVisible();
});

test("the inspector idles until a row is selected", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chunklens:onboarded", "1"));
  await page.goto("/c/demo/records");
  await expect(page.getByRole("grid", { name: /records/i })).toBeVisible();

  const inspector = page.getByRole("complementary", { name: /inspector/i });
  await expect(inspector.getByText("nothing selected")).toBeVisible();

  await page.getByText("alpha doc").click();
  await expect(inspector.getByText("nothing selected")).toBeHidden();
  await expect(inspector.getByText("alpha doc")).toBeVisible();
});

test("a first run greets you once with the palette hint", async ({ page }) => {
  // No init script here: this is the one spec that runs with a virgin
  // localStorage, which is exactly the condition the toast keys off.
  await page.goto("/");
  await expect(page.getByText(/command palette/i)).toBeVisible();
});

test("the collections rail and records grid show skeletons before data lands", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("chunklens:onboarded", "1"));
  // Hold the records fetch open so the loading state is observable rather than
  // a race: the rail resolves normally, the grid stays in its skeleton.
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route("**/api/collections/demo/records*", async (route) => {
    await held;
    await route.continue();
  });

  await page.goto("/c/demo/records");
  await expect(page.getByRole("status", { name: /loading records/i })).toBeVisible();

  release();
  await expect(page.getByRole("grid", { name: /records/i })).toBeVisible();
  await expect(page.getByRole("status", { name: /loading records/i })).toBeHidden();
});
