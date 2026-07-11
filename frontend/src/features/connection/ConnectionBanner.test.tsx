import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
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

test("announces a failed status check, not just an ok:false answer", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(INFO);
  // The chunklens backend itself is unreachable: the fetch rejects rather than
  // answering. TanStack v5 keeps the last successful `data`, so a banner that
  // only reads `status.ok` would stay hidden (and, with no poll armed, the UI
  // could never self-heal). It must key off the error state as well.
  const test_ = vi.spyOn(api, "testConnection").mockRejectedValue(new Error("network"));
  render(wrap(<ConnectionBanner onOpenSettings={() => {}} />));
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(/connection check failed/i);
  // It must not claim anything about chroma - the check never got an answer.
  expect(alert).not.toHaveTextContent(/chroma unreachable/i);
  const calls = test_.mock.calls.length;
  await userEvent.click(screen.getByRole("button", { name: /retry/i }));
  await waitFor(() => expect(test_.mock.calls.length).toBeGreaterThan(calls));
});

test("appears when a check fails after an earlier one succeeded (stale ok data)", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(INFO);
  const probe = vi
    .spyOn(api, "testConnection")
    .mockResolvedValue({ ok: true, error: null, heartbeat_ns: 1 });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ConnectionBanner onOpenSettings={() => {}} />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(api.testConnection).toHaveBeenCalled());
  expect(screen.queryByRole("alert")).toBeNull();
  // The backend dies mid-session. v5 keeps the last successful data, so the
  // banner would otherwise never appear - the app would sit on a green LED.
  probe.mockRejectedValue(new Error("network"));
  await act(async () => {
    await qc.refetchQueries({ queryKey: ["connection", "status"] });
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(/connection check failed/i);
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
