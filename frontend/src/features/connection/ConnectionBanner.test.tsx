import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ConnectionBanner } from "./ConnectionBanner";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const INFO = {
  host: "localhost", port: 8000, ssl: false, tenant: "default_tenant",
  database: "default_database", auth_mode: "none" as const, has_token: false,
};

test("renders nothing while the connection is healthy", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(INFO);
  vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true, error: null, heartbeat_ns: 1 });
  render(wrap(<ConnectionBanner onOpenSettings={() => {}} />));
  await waitFor(() => expect(api.testConnection).toHaveBeenCalled());
  expect(screen.queryByRole("alert")).toBeNull();
});

test("stays invisible on the first paint, before any check has returned", () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(INFO);
  // A check that never settles: the banner must not flash "unreachable" while
  // the very first status probe is still in flight.
  vi.spyOn(api, "testConnection").mockReturnValue(new Promise(() => {}));
  const { container } = render(wrap(<ConnectionBanner onOpenSettings={() => {}} />));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(container.querySelector(".conn-banner")).toBeNull();
});

test("announces a down connection with the address and retries on demand", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(INFO);
  const test_ = vi
    .spyOn(api, "testConnection")
    .mockResolvedValue({ ok: false, error: "refused", heartbeat_ns: null });
  const onOpenSettings = vi.fn();
  render(wrap(<ConnectionBanner onOpenSettings={onOpenSettings} />));
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("localhost:8000");
  const calls = test_.mock.calls.length;
  await userEvent.click(screen.getByRole("button", { name: /retry/i }));
  await waitFor(() => expect(test_.mock.calls.length).toBeGreaterThan(calls));
  await userEvent.click(screen.getByRole("button", { name: /connection settings/i }));
  expect(onOpenSettings).toHaveBeenCalledOnce();
});
