import { expect, test } from "@playwright/test";

const GOOD = {
  host: "localhost",
  port: 8000,
  ssl: false,
  tenant: "default_tenant",
  database: "default_database",
  auth_mode: "none" as const,
};

// Restore the connection unconditionally: a failure between the dead-port
// write and the recovery would otherwise poison every spec after this one
// (the suite shares one backend and one persisted connection config).
test.afterEach(async ({ request }) => {
  const res = await request.put("/api/connection", { data: GOOD });
  expect(res.ok()).toBeTruthy();
});

test("a dead chroma raises the app-level banner and Retry clears it after recovery", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /demo/ })).toBeVisible();

  // Point the backend at a port nothing listens on, then reload so the app
  // re-checks the connection from a cold start.
  await request.put("/api/connection", { data: { ...GOOD, port: 9 } });
  await page.reload();

  const banner = page.getByRole("alert").filter({ hasText: /chroma unreachable/i });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText("localhost:9");

  // Recover server-side, then clear the banner through its own Retry button.
  await request.put("/api/connection", { data: GOOD });
  await banner.getByRole("button", { name: /retry/i }).click();
  await expect(banner).not.toBeVisible();
  await expect(page.getByRole("button", { name: /demo/ })).toBeVisible();
});
