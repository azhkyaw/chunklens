import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { App } from "./App";
import { api } from "./api/client";

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

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
  expect(await screen.findByRole("grid")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /^records$/i })).toHaveAttribute("aria-selected", "true");
  expect(history[history.length - 1]).toBe("/c/demo/records");
});

test("a deep link to the query tab restores it", async () => {
  mockHappyPath();
  renderApp("/c/demo/query");
  expect(await screen.findByLabelText(/query text/i)).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /^query$/i })).toHaveAttribute("aria-selected", "true");
  expect(screen.queryByRole("grid")).not.toBeInTheDocument();
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
  expect(await screen.findByRole("grid")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: /^query$/i }));
  expect(await screen.findByLabelText(/query text/i)).toBeInTheDocument();
  expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: /^compare$/i }));
  expect(await screen.findByRole("button", { name: /run both/i })).toBeInTheDocument();
});

test("a bare collection path redirects to its records tab", async () => {
  mockHappyPath();
  const { history } = renderApp("/c/demo");
  expect(await screen.findByRole("grid")).toBeInTheDocument();
  await waitFor(() => expect(history[history.length - 1]).toBe("/c/demo/records"));
});

test("an unknown tab redirects to records", async () => {
  mockHappyPath();
  const { history } = renderApp("/c/demo/bogus");
  expect(await screen.findByRole("grid")).toBeInTheDocument();
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

test("the rail add menu opens New and Import as modals", async () => {
  mockHappyPath();
  renderApp("/");
  await userEvent.click(await screen.findByRole("button", { name: /add collection/i }));
  await userEvent.click(screen.getByRole("menuitem", { name: /new collection/i }));
  expect(screen.getByRole("dialog", { name: /new collection/i })).toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /add collection/i }));
  await userEvent.click(screen.getByRole("menuitem", { name: /import collection/i }));
  expect(screen.getByRole("dialog", { name: /import collection/i })).toBeInTheDocument();
});

test("a collection route shows the inspector pane; home does not", async () => {
  mockHappyPath();
  renderApp("/c/demo/records");
  expect(await screen.findByRole("complementary", { name: /inspector/i })).toBeInTheDocument();
  expect(screen.getByText(/select a row/i)).toBeInTheDocument();
});

test("the home route has no inspector pane", async () => {
  mockHappyPath();
  renderApp("/");
  expect(await screen.findByText(/no collection selected/i)).toBeInTheDocument();
  expect(screen.queryByRole("complementary", { name: /inspector/i })).not.toBeInTheDocument();
});

test("the inspector collapses to a reopen strip and expands back", async () => {
  mockHappyPath();
  renderApp("/c/demo/records");
  await screen.findByRole("complementary", { name: /inspector/i });
  await userEvent.click(screen.getByRole("button", { name: /close inspector/i }));
  expect(screen.queryByRole("complementary", { name: /inspector/i })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /open inspector/i }));
  expect(screen.getByRole("complementary", { name: /inspector/i })).toBeInTheDocument();
});

test("a session-collapsed inspector starts collapsed", async () => {
  sessionStorage.setItem("chunklens:inspector-open", "0");
  mockHappyPath();
  renderApp("/c/demo/records");
  expect(await screen.findByRole("button", { name: /open inspector/i })).toBeInTheDocument();
  sessionStorage.clear();
});

test("ctrl+k opens the palette and picking a collection navigates to it", async () => {
  mockHappyPath();
  const { history } = renderApp("/");
  await screen.findByRole("button", { name: /^demo\b/ });
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  const dialog = await screen.findByRole("dialog", { name: /command palette/i });
  await userEvent.click(within(dialog).getByText("demo"));
  await waitFor(() => expect(history[history.length - 1]).toBe("/c/demo/records"));
  expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();
});

test("the topbar hint button opens the palette", async () => {
  mockHappyPath();
  renderApp("/");
  await userEvent.click(screen.getByRole("button", { name: /open command palette/i }));
  expect(await screen.findByRole("dialog", { name: /command palette/i })).toBeInTheDocument();
});

test("palette -> New collection -> close returns focus to the live palette hint, not body", async () => {
  mockHappyPath();
  renderApp("/");
  const hint = await screen.findByRole("button", { name: /open command palette/i });
  await userEvent.click(hint);
  const dialog = await screen.findByRole("dialog", { name: /command palette/i });
  await userEvent.click(within(dialog).getByText("New collection"));

  const modal = await screen.findByRole("dialog", { name: /new collection/i });
  expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(modal).not.toBeInTheDocument());

  expect(document.activeElement).not.toBe(document.body);
  expect(hint).toHaveFocus();
});

test("the palette opens the manage modal for the selected collection", async () => {
  mockHappyPath();
  renderApp("/c/demo/records");
  await screen.findByRole("grid");
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  const dialog = await screen.findByRole("dialog", { name: /command palette/i });
  await userEvent.click(within(dialog).getByText("Manage collection"));
  expect(await screen.findByRole("dialog", { name: /manage collection/i })).toBeInTheDocument();
});

test("the palette toggles the theme", async () => {
  mockHappyPath();
  renderApp("/");
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  const dialog = await screen.findByRole("dialog", { name: /command palette/i });
  await userEvent.click(within(dialog).getByText("Toggle theme"));
  expect(document.documentElement.dataset.theme).toBe("light");
});

test("switching collections via the palette closes a manage modal left open for the old one", async () => {
  mockHappyPath();
  vi.spyOn(api, "listCollections").mockResolvedValue([
    { name: "demo", count: 3 },
    { name: "other", count: 5 },
  ]);
  const { history } = renderApp("/c/demo/records");
  await screen.findByRole("grid");

  await userEvent.click(screen.getByRole("button", { name: /^manage$/i }));
  expect(await screen.findByRole("dialog", { name: /manage collection/i })).toBeInTheDocument();

  // mod+ combos fire even while a dialog is open (see useShortcut), so the
  // palette must still open on top of the already-open Manage modal.
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  const dialog = await screen.findByRole("dialog", { name: /command palette/i });
  await userEvent.click(within(dialog).getByText("other"));

  await waitFor(() => expect(history[history.length - 1]).toBe("/c/other/records"));
  expect(screen.queryByRole("dialog", { name: /manage collection/i })).not.toBeInTheDocument();
});

test("ctrl+k a second time closes the palette", async () => {
  mockHappyPath();
  renderApp("/");
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  expect(await screen.findByRole("dialog", { name: /command palette/i })).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: /command palette/i })).not.toBeInTheDocument(),
  );
});

test("? opens the shortcuts cheat sheet", async () => {
  mockHappyPath();
  renderApp("/");
  await screen.findByText(/no collection selected/i);
  fireEvent.keyDown(window, { key: "?" });
  expect(await screen.findByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
});

test("] and [ cycle the main tabs", async () => {
  mockHappyPath();
  const { history } = renderApp("/c/demo/records");
  await screen.findByRole("grid");
  fireEvent.keyDown(window, { key: "]" });
  await waitFor(() => expect(history[history.length - 1]).toBe("/c/demo/query"));
  fireEvent.keyDown(window, { key: "[" });
  await waitFor(() => expect(history[history.length - 1]).toBe("/c/demo/records"));
});

test("i toggles the inspector", async () => {
  mockHappyPath();
  renderApp("/c/demo/records");
  await screen.findByRole("complementary", { name: /inspector/i });
  fireEvent.keyDown(window, { key: "i" });
  expect(screen.queryByRole("complementary", { name: /inspector/i })).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: "i" });
  expect(await screen.findByRole("complementary", { name: /inspector/i })).toBeInTheDocument();
});

test("g then c focuses the collections rail", async () => {
  mockHappyPath();
  renderApp("/");
  const item = await screen.findByRole("button", { name: /^demo\b/ });
  fireEvent.keyDown(window, { key: "g" });
  fireEvent.keyDown(window, { key: "c" });
  expect(item).toHaveFocus();
});

test("Enter focuses the inspector pane", async () => {
  mockHappyPath();
  renderApp("/c/demo/records");
  const pane = await screen.findByRole("complementary", { name: /inspector/i });
  fireEvent.keyDown(window, { key: "Enter" });
  expect(pane).toHaveFocus();
});

test("Escape blurs a focused input", async () => {
  mockHappyPath();
  renderApp("/c/demo/query");
  const input = await screen.findByLabelText(/query text/i);
  input.focus();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(input).not.toHaveFocus();
});
