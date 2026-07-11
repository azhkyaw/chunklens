import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./api/client";
import { setLastLatency } from "./lib/latency";
import { StatusBar } from "./StatusBar";

afterEach(() => {
  vi.restoreAllMocks();
  // StatusBar (if still mounted from the test that just ran) subscribes to
  // this store via useSyncExternalStore, so resetting it can synchronously
  // trigger a re-render - wrap in act() to keep that off the console.
  act(() => setLastLatency(null));
});

function renderBar(collection: string | null) {
  vi.spyOn(api, "getConnection").mockResolvedValue({
    host: "localhost", port: 8000, ssl: false,
    tenant: "default_tenant", database: "default_database",
    auth_mode: "none", has_token: false,
  });
  vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue({
    name: "demo", count: 3, dimensionality: 384,
    distance_metric: "l2", embedding_function: "default", metadata: {},
  });
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <StatusBar collection={collection} />
    </QueryClientProvider>,
  );
}

test("shows the connection address and settles on connected", async () => {
  renderBar(null);
  expect(await screen.findByText("localhost:8000")).toBeInTheDocument();
  await waitFor(() =>
    expect(document.querySelector('.statusbar-conn[data-state="connected"]')).toBeInTheDocument(),
  );
});

test("the LED drops to disconnected when a later check fails, instead of staying stale-green", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue({
    host: "localhost", port: 8000, ssl: false,
    tenant: "default_tenant", database: "default_database",
    auth_mode: "none", has_token: false,
  });
  const probe = vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <StatusBar collection={null} />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(document.querySelector('.statusbar-conn[data-state="connected"]')).toBeInTheDocument(),
  );
  // Now the backend dies and the next check rejects. TanStack v5 KEEPS the last
  // successful data ({ ok: true }), so a component reading only `status?.ok`
  // would hold a green "connected" LED over a dead server forever.
  probe.mockRejectedValue(new Error("network"));
  await act(async () => {
    await qc.refetchQueries({ queryKey: ["connection", "status"] });
  });
  await waitFor(() =>
    expect(
      document.querySelector('.statusbar-conn[data-state="disconnected"]'),
    ).toBeInTheDocument(),
  );
  expect(document.querySelector('.statusbar-conn[data-state="connected"]')).toBeNull();
});

test("shows collection stats when a collection is open", async () => {
  renderBar("demo");
  expect(await screen.findByText("3 records · 384 dims · l2")).toBeInTheDocument();
  // Verify hints also render alongside stats (regression test for flexbox auto-margin layout)
  expect(screen.getByText(/j\/k navigate · \? shortcuts/i)).toBeInTheDocument();
});

test("omits stats when no collection is open", async () => {
  renderBar(null);
  expect(await screen.findByText("localhost:8000")).toBeInTheDocument();
  expect(screen.queryByText(/records ·/)).not.toBeInTheDocument();
});

test("shows the keyboard hints", () => {
  renderBar(null);
  expect(screen.getByText(/j\/k navigate · \? shortcuts/i)).toBeInTheDocument();
});

test("shows the last query latency once one is recorded", async () => {
  setLastLatency(38);
  renderBar(null);
  expect(await screen.findByText(/last query 38 ms/)).toBeInTheDocument();
});

test("shows no latency before any query has run", async () => {
  setLastLatency(null);
  renderBar(null);
  expect(await screen.findByText("localhost:8000")).toBeInTheDocument();
  expect(screen.queryByText(/last query/)).not.toBeInTheDocument();
});
