import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ConnectionStatus } from "./ConnectionStatus";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

test("shows connected and host:port", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue({
    host: "localhost", port: 8000, ssl: false,
    tenant: "default_tenant", database: "default_database",
    auth_mode: "none", has_token: false,
  });
  vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  render(wrap(<ConnectionStatus />));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/connected/i));
  expect(screen.getByRole("status")).toHaveTextContent("localhost:8000");
});
