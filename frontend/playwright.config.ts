import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:8765" },
  timeout: 30_000,
  // The specs share one backend + Chroma database + persisted connection
  // config, and some create/delete collections. Run serially so they don't
  // race on that shared state (parallel runs are non-deterministic).
  workers: 1,
});
