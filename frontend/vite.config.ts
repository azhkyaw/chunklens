/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://127.0.0.1:8765" },
  },
  build: {
    outDir: "../backend/src/chunklens/web",
    emptyOutDir: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Unit tests live under src/; the Playwright e2e specs in e2e/ use a
    // different runner and must not be collected by Vitest.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
