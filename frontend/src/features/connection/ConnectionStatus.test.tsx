import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
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

test("the pill drops to disconnected when a later probe fails, instead of staying stale-connected", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  const probe = vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  // retry: false - the rejected probe must land in the error state at once
  // instead of burning three backoff-delayed attempts.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ConnectionStatus onOpen={vi.fn()} />
    </QueryClientProvider>,
  );
  await screen.findByRole("button", { name: /\bconnected\b/i });
  // The backend dies and the next probe rejects. TanStack v5 KEEPS the last
  // successful data ({ ok: true }), so a pill reading only `status?.ok` would
  // keep claiming "connected" over a dead server.
  probe.mockRejectedValue(new Error("network"));
  await act(async () => {
    await qc.refetchQueries({ queryKey: ["connection", "status"] });
  });
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
