import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { App } from "./App";
import { api } from "./api/client";

afterEach(() => vi.restoreAllMocks());

const CONN = {
  host: "localhost", port: 8000, ssl: false,
  tenant: "default_tenant", database: "default_database",
  auth_mode: "none" as const, has_token: false,
};
const DETAILS = {
  name: "demo", count: 3, dimensionality: 384,
  distance_metric: "l2", embedding_function: "default", metadata: {},
};

function mockHappyPath() {
  vi.spyOn(api, "listCollections").mockResolvedValue([{ name: "demo", count: 3 }]);
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "getRecords").mockResolvedValue({
    items: [{ id: "a", document: "alpha doc", metadata: { lang: "en" } }],
    limit: 25, offset: 0, total: 1,
  });
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
}

function renderApp(path = "/") {
  const { hook, history } = memoryLocation({ path, record: true });
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <Router hook={hook}>
        <App />
      </Router>
    </QueryClientProvider>,
  );
  return { qc, history };
}

test("the home route shows the brand and the empty bench", async () => {
  mockHappyPath();
  renderApp("/");
  expect(screen.getByText("ChunkLens")).toBeInTheDocument();
  expect(await screen.findByText(/no collection selected/i)).toBeInTheDocument();
});

test("selecting a collection navigates to its records tab", async () => {
  mockHappyPath();
  const { history } = renderApp("/");
  await userEvent.click(await screen.findByRole("button", { name: /^demo\b/ }));
  expect(await screen.findByRole("table")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /^records$/i })).toHaveAttribute("aria-selected", "true");
  expect(history[history.length - 1]).toBe("/c/demo/records");
});

test("a deep link to the query tab restores it", async () => {
  mockHappyPath();
  renderApp("/c/demo/query");
  expect(await screen.findByLabelText(/query text/i)).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /^query$/i })).toHaveAttribute("aria-selected", "true");
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

test("a deep link to the compare tab restores it", async () => {
  mockHappyPath();
  renderApp("/c/demo/compare");
  expect(await screen.findByRole("button", { name: /run both/i })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /^compare$/i })).toHaveAttribute("aria-selected", "true");
});

test("the view tabs switch between records, query, and compare", async () => {
  mockHappyPath();
  renderApp("/c/demo/records");
  expect(await screen.findByRole("table")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: /^query$/i }));
  expect(await screen.findByLabelText(/query text/i)).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: /^compare$/i }));
  expect(await screen.findByRole("button", { name: /run both/i })).toBeInTheDocument();
});

test("a bare collection path redirects to its records tab", async () => {
  mockHappyPath();
  const { history } = renderApp("/c/demo");
  expect(await screen.findByRole("table")).toBeInTheDocument();
  await waitFor(() => expect(history[history.length - 1]).toBe("/c/demo/records"));
});

test("an unknown tab redirects to records", async () => {
  mockHappyPath();
  const { history } = renderApp("/c/demo/bogus");
  expect(await screen.findByRole("table")).toBeInTheDocument();
  await waitFor(() => expect(history[history.length - 1]).toBe("/c/demo/records"));
});

test("an unknown path redirects home", async () => {
  mockHappyPath();
  const { history } = renderApp("/nope/nothing");
  expect(await screen.findByText(/no collection selected/i)).toBeInTheDocument();
  await waitFor(() => expect(history[history.length - 1]).toBe("/"));
});

test("switching collections resets records paging state", async () => {
  vi.spyOn(api, "listCollections").mockResolvedValue([
    { name: "big", count: 30 },
    { name: "small", count: 2 },
  ]);
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  vi.spyOn(api, "getCollectionDetails").mockImplementation(async (name) => ({ ...DETAILS, name }));
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  const recSpy = vi.spyOn(api, "getRecords").mockImplementation(async (name, limit = 25, offset = 0) => ({
    items: [{ id: `${name}-${offset}`, document: "d", metadata: null }],
    limit, offset, total: name === "big" ? 30 : 2,
  }));

  renderApp("/");
  await userEvent.click(await screen.findByRole("button", { name: /^big\b/ }));
  await userEvent.click(await screen.findByRole("button", { name: /^next$/i }));
  expect(await screen.findByText("26–30 of 30")).toBeInTheDocument();

  // Switching to another collection must start back at page one, not carry offset 25.
  await userEvent.click(screen.getByRole("button", { name: /^small\b/ }));
  expect(await screen.findByText("1–2 of 2")).toBeInTheDocument();
  expect(recSpy).not.toHaveBeenCalledWith("small", 25, 25);
});

test("switching the connection clears caches and returns home", async () => {
  mockHappyPath();
  vi.spyOn(api, "saveConnection").mockResolvedValue({ ...CONN, host: "otherhost" });
  const { qc, history } = renderApp("/c/demo/records");
  expect(await screen.findByRole("heading", { name: "demo", level: 2 })).toBeInTheDocument();
  // Seed a per-collection cache entry the old onSaved forgot to clear (L-5).
  qc.setQueryData(["sources", "demo", "lang"], { key: "lang", values: [] });

  await userEvent.click(await screen.findByRole("button", { name: /\bconnected\b/i }));
  expect(screen.getByRole("dialog", { name: /connection settings/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /^connect$/i }));

  expect(await screen.findByText(/no collection selected/i)).toBeInTheDocument();
  expect(history[history.length - 1]).toBe("/");
  expect(qc.getQueryData(["sources", "demo", "lang"])).toBeUndefined();
});
