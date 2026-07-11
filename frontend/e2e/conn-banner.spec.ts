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
//
// This writes the backend's default no-auth connection. If you are running
// this suite locally against a Chroma that needs a token, this wipes that
// saved token from ~/.chunklens/config.json and you will need to re-enter
// it afterward.
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

  // Retry only refetches the connection status check, not the collections
  // list, so it alone does not bring "demo" back. The collections list
  // recovers on its own background retry schedule instead, which is not
  // what this spec is meant to pin down. Reload so the reappearance of
  // "demo" is driven by the restored connection, not by an unrelated
  // retry timer that could change independently of this feature.
  await page.reload();
  await expect(page.getByRole("button", { name: /demo/ })).toBeVisible();
});
