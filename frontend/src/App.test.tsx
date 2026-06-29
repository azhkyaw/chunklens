import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { App } from "./App";
import { api } from "./api/client";

afterEach(() => vi.restoreAllMocks());

function renderApp() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  );
}

const CONN = {
  host: "localhost", port: 8000, ssl: false,
  tenant: "default_tenant", database: "default_database",
  auth_mode: "none" as const, has_token: false,
};
const DETAILS = {
  name: "demo", count: 3, dimensionality: 384,
  distance_metric: "l2", embedding_function: "default", metadata: {},
};

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

test("a selected collection lands on Records and can switch to Query", async () => {
  vi.spyOn(api, "listCollections").mockResolvedValue([{ name: "demo", count: 3 }]);
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "getRecords").mockResolvedValue({
    items: [{ id: "a", document: "alpha doc", metadata: { lang: "en" } }],
    limit: 25, offset: 0, total: 1,
  });
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });

  renderApp();
  await userEvent.click(await screen.findByRole("button", { name: /^demo\b/ }));

  // default view = Records: the table is shown, the Records tab is selected
  expect(await screen.findByRole("table")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /^records$/i })).toHaveAttribute("aria-selected", "true");

  // switch to Query: the console heading shows, the table is gone
  await userEvent.click(screen.getByRole("tab", { name: /^query$/i }));
  expect(screen.getByRole("heading", { name: "Query" })).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

test("switching the connection clears the selected collection from the view", async () => {
  vi.spyOn(api, "listCollections").mockResolvedValue([{ name: "demo", count: 3 }]);
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "getRecords").mockResolvedValue({ items: [], limit: 25, offset: 0, total: 0 });
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "saveConnection").mockResolvedValue({ ...CONN, host: "otherhost" });

  renderApp();
  await userEvent.click(await screen.findByRole("button", { name: /^demo\b/ }));
  expect(await screen.findByRole("heading", { name: "demo", level: 2 })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /^connection$/i }));
  await userEvent.click(screen.getByRole("button", { name: /^connect$/i }));

  expect(await screen.findByText(/no collection selected/i)).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "demo", level: 2 })).not.toBeInTheDocument();
});
