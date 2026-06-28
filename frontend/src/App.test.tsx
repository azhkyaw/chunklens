import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { App } from "./App";
import { api } from "./api/client";

afterEach(() => vi.restoreAllMocks());

test("renders the app title and a New collection toggle", () => {
  vi.spyOn(api, "listCollections").mockResolvedValue([]);
  vi.spyOn(api, "getConnection").mockResolvedValue({
    host: "localhost", port: 8000, ssl: false,
    tenant: "default_tenant", database: "default_database",
    auth_mode: "none", has_token: false,
  });
  vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  );
  expect(screen.getByText("ChunkLens")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /new collection/i })).toBeInTheDocument();
});
