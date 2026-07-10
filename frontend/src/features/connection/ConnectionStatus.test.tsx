import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../api/client";
import { ConnectionStatus } from "./ConnectionStatus";

afterEach(() => vi.restoreAllMocks());

const CONN = {
  host: "localhost", port: 8000, ssl: false,
  tenant: "default_tenant", database: "default_database",
  auth_mode: "none" as const, has_token: false,
};

function renderPill(ok: boolean, onOpen = vi.fn()) {
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "testConnection").mockResolvedValue(ok ? { ok: true } : { ok: false, error: "nope" });
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <ConnectionStatus onOpen={onOpen} />
    </QueryClientProvider>,
  );
  return onOpen;
}

test("shows a connected pill with address and tenant", async () => {
  renderPill(true);
  const pill = await screen.findByRole("button", { name: /\bconnected\b/i });
  expect(pill).toHaveAttribute("data-state", "connected");
  expect(pill).toHaveTextContent("localhost:8000 · default_tenant");
});

test("shows a disconnected state when the probe fails", async () => {
  renderPill(false);
  const pill = await screen.findByRole("button", { name: /disconnected/i });
  expect(pill).toHaveAttribute("data-state", "disconnected");
});

test("clicking the pill opens the connection settings", async () => {
  const onOpen = renderPill(true);
  const pill = await screen.findByRole("button", { name: /\bconnected\b/i });
  expect(pill).toHaveAttribute("aria-haspopup", "dialog");
  await userEvent.click(pill);
  expect(onOpen).toHaveBeenCalledTimes(1);
});
