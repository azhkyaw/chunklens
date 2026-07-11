import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:8765",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
  },
  // A text query embeds server-side through ONNX on every request (it is
  // rebuilt per call, not cached after a warmup), and a single one has been
  // measured at ~4.6s here. That leaves both Playwright's defaults too tight:
  // the 5s default expect timeout gives almost no margin around a query, and
  // the whole-test timeout needs enough room for specs that run more than one
  // query (a compare fires two at once) to actually reach their own budgets.
  expect: { timeout: 15_000 },
  timeout: 60_000,
  // If the backend is broken (say, the seeded collection never shows up),
  // almost every spec fails the same way, and each failure would otherwise
  // wait out the full test timeout before giving up. Cap it in CI so a
  // broken shared backend fails fast instead of burning the whole job
  // timeout; unlimited locally, where a run is a person watching it fail.
  maxFailures: process.env.CI ? 5 : 0,
  // Fail the run if a test.only slips into a commit instead of silently
  // shrinking the suite to whatever was left marked exclusive.
  forbidOnly: !!process.env.CI,
  // The specs share one backend + Chroma database + persisted connection
  // config, and some create/delete collections. Run serially so they don't
  // race on that shared state (parallel runs are non-deterministic).
  workers: 1,
});
