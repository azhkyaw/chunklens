import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { SingleQuery } from "./SingleQuery";
import { api } from "../../api/client";
import { SelectionProvider } from "../../lib/selection";
import { getHistory, requestReplay, clearHistory } from "../../lib/queryHistory";
import { newQuerySpec } from "./querySpec";

afterEach(() => {
  vi.restoreAllMocks();
  clearHistory();
});
function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}><SelectionProvider resetKey="docs/query">{ui}</SelectionProvider></QueryClientProvider>;
}
// dim 384 => default-EF collection stays in Text mode under the smart default
const DETAILS = { name: "docs", count: 1, dimensionality: 384, distance_metric: "cosine", embedding_function: "default", metadata: {} };

test("runs a query and shows scored ranked hits", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "query").mockResolvedValue({ hits: [{ id: "doc_42", document: "alpha", metadata: null, distance: 0.09 }] });
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "alpha");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  expect(await screen.findByText("doc_42")).toBeInTheDocument();
  expect(screen.getByText("0.91")).toBeInTheDocument();          // cosine similarity
});

test("shows the no-query-yet idle state before the first run", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  render(wrap(<SingleQuery name="docs" />));
  expect(await screen.findByText("no query yet")).toBeInTheDocument();
});

test("the idle state does not sit under a failed run's error alert", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "query").mockRejectedValue(new Error("boom"));
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "alpha");
  expect(screen.getByText("no query yet")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  await screen.findByRole("alert");
  // an error already explains the empty results area - the idle prompt must
  // not sit underneath it as if nothing had been run
  expect(screen.queryByText("no query yet")).not.toBeInTheDocument();
});

test("shows a results skeleton while the query runs", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "query").mockReturnValue(new Promise(() => {}));
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "alpha");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  expect(await screen.findByRole("status", { name: /running query/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^run$/i })).toHaveAttribute("aria-busy", "true");
});

test("sends the built where filter with the query", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [{ key: "lang", types: ["string"] }], sampled: 3, total: 3 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const run = vi.spyOn(api, "query").mockResolvedValue({ hits: [] });
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "hello");
  await userEvent.click(screen.getAllByRole("button", { name: /add condition/i })[0]);
  await userEvent.type(screen.getByLabelText(/^field$/i), "lang");
  await userEvent.type(screen.getByLabelText(/^value$/i), "en");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  await waitFor(() => expect(run).toHaveBeenCalled());
  expect(run.mock.calls[0][1].where).toEqual({ lang: { $eq: "en" } });
});

test("blocks Run and shows a banner for text on a none-EF collection", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue({ name: "docs", count: 0, dimensionality: 3, distance_metric: "l2", embedding_function: "none", metadata: {} });
  render(wrap(<SingleQuery name="docs" />));
  await waitFor(() => expect(screen.getByText(/EF:/)).toBeInTheDocument());
  // none-EF defaults to Vector; switch to Text to exercise the text-query block
  await userEvent.click(screen.getByRole("tab", { name: /^text$/i }));
  await userEvent.type(screen.getByLabelText(/query text/i), "hello");
  expect(screen.getByRole("button", { name: /^run$/i })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent(/no embedding function/i);
});

test("interprets a dimension-mismatch query error", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue({ name: "docs", count: 0, dimensionality: 384, distance_metric: "l2", embedding_function: "default", metadata: {} });
  vi.spyOn(api, "query").mockRejectedValue(new Error("embedding with dimension 384, got 2"));
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "hello");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  expect(await screen.findByText(/dimensionality/i)).toBeInTheDocument();
});

test("a none-EF collection defaults to Vector mode and runs with query_embedding", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue({ name: "docs", count: 1, dimensionality: 3, distance_metric: "l2", embedding_function: "none", metadata: {} });
  const q = vi.spyOn(api, "query").mockResolvedValue({ hits: [] });
  render(wrap(<SingleQuery name="docs" />));
  const ta = await screen.findByLabelText(/query vector/i); // smart default -> Vector
  await userEvent.type(ta, "1, 2, 3");                       // bare CSV (avoid userEvent's [ ] special chars)
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  await waitFor(() => expect(q).toHaveBeenCalledWith("docs", expect.objectContaining({ query_embedding: [1, 2, 3] })));
});

test("j moves the hit selection after a run", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "query").mockResolvedValue({
    hits: [
      { id: "doc_1", document: "alpha", metadata: null, distance: 0.1 },
      { id: "doc_2", document: "beta", metadata: null, distance: 0.2 },
    ],
  });
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "alpha");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  await screen.findByText("doc_1");
  const list = screen.getByRole("listbox", { name: /^results$/i });
  fireEvent.keyDown(window, { key: "j" });
  expect(within(list).getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(window, { key: "j" });
  expect(within(list).getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
});

test("j moves DOM focus onto the hit button so Enter acts on the selected hit", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "query").mockResolvedValue({
    hits: [
      { id: "doc_1", document: "alpha", metadata: null, distance: 0.1 },
      { id: "doc_2", document: "beta", metadata: null, distance: 0.2 },
    ],
  });
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "alpha");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  await screen.findByText("doc_1");
  const list = screen.getByRole("listbox", { name: /^results$/i });
  fireEvent.keyDown(window, { key: "j" });
  fireEvent.keyDown(window, { key: "j" });
  const second = within(list).getAllByRole("option")[1];
  expect(second).toHaveAttribute("aria-selected", "true");
  expect(within(second).getByRole("button")).toHaveFocus();
});

test("/ focuses the query input", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  render(wrap(<SingleQuery name="docs" />));
  await screen.findByLabelText(/query text/i);
  fireEvent.keyDown(window, { key: "/" });
  expect(screen.getByLabelText(/query text/i)).toHaveFocus();
});

test("a surfaced-provider collection (openai, 1536-dim) opens in Text mode with picker and no warn", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([
    { id: "openai", label: "OpenAI", needs_key: true, sdk_available: true, install_extra: null, env_var: "CHROMA_OPENAI_API_KEY", key_set: false, env_key: false },
  ]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue({ name: "oa", count: 1, dimensionality: 1536, distance_metric: "l2", embedding_function: "openai", metadata: {} });
  render(wrap(<SingleQuery name="oa" />));
  // The picker pre-fills via an effect, so retry the value assertion.
  await waitFor(() => expect(screen.getByLabelText(/embed query with/i)).toHaveValue("openai"));
  expect(screen.getByLabelText(/query text/i)).toBeInTheDocument();                 // text input, not vector paste
  expect(screen.queryByText(/won't match/i)).not.toBeInTheDocument();               // dim warn suppressed
});

test("copy Python renders the current query including filters", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [{ key: "lang", types: ["string"] }], sampled: 3, total: 3 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "getConnection").mockResolvedValue({
    host: "localhost", port: 8000, ssl: false,
    tenant: "default_tenant", database: "default_database",
    auth_mode: "none", has_token: false,
  });
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "hello");
  await userEvent.click(screen.getAllByRole("button", { name: /add condition/i })[0]);
  await userEvent.type(screen.getByLabelText(/^field$/i), "lang");
  await userEvent.type(screen.getByLabelText(/^value$/i), "en");
  await userEvent.click(await screen.findByRole("button", { name: /^copy python$/i }));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  const snippet = writeText.mock.calls[0][0] as string;
  expect(snippet).toContain('query_texts=["hello"]');
  expect(snippet).toContain('where={"lang": {"$eq": "en"}}');
});

test("copy JS is disabled until the query is ready", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "getConnection").mockResolvedValue({
    host: "localhost", port: 8000, ssl: false,
    tenant: "default_tenant", database: "default_database",
    auth_mode: "none", has_token: false,
  });
  render(wrap(<SingleQuery name="docs" />));
  const btn = await screen.findByRole("button", { name: /^copy js$/i });
  expect(btn).toBeDisabled(); // empty query text
  await userEvent.type(screen.getByLabelText(/query text/i), "hello");
  expect(btn).toBeEnabled();
});

test("copy buttons stay enabled while Run is disabled by a guard block", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue({ name: "docs", count: 0, dimensionality: 3, distance_metric: "l2", embedding_function: "none", metadata: {} });
  vi.spyOn(api, "getConnection").mockResolvedValue({
    host: "localhost", port: 8000, ssl: false,
    tenant: "default_tenant", database: "default_database",
    auth_mode: "none", has_token: false,
  });
  render(wrap(<SingleQuery name="docs" />));
  await waitFor(() => expect(screen.getByText(/EF:/)).toBeInTheDocument());
  // none-EF defaults to Vector; switch to Text to exercise the text-query block
  await userEvent.click(screen.getByRole("tab", { name: /^text$/i }));
  await userEvent.type(screen.getByLabelText(/query text/i), "hello");
  expect(screen.getByRole("button", { name: /^run$/i })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent(/no embedding function/i);
  // Copy is a clipboard action, not a server round-trip: a blocked query
  // (guard) is still a query worth copying out to debug elsewhere.
  expect(await screen.findByRole("button", { name: /^copy python$/i })).toBeEnabled();
  expect(screen.getByRole("button", { name: /^copy js$/i })).toBeEnabled();
});

test("a successful run records the query in the session history", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "query").mockResolvedValue({ hits: [] });
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "alpha");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  await waitFor(() => expect(getHistory("docs")).toHaveLength(1));
  expect(getHistory("docs")[0].label).toContain("alpha");
});

test("a failed run is not recorded", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "query").mockRejectedValue(new Error("boom"));
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "alpha");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  await screen.findByRole("alert");
  expect(getHistory("docs")).toHaveLength(0);
});

test("a pending replay is consumed on mount, restores the form, and auto-runs", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const q = vi.spyOn(api, "query").mockResolvedValue({ hits: [] });
  requestReplay("docs", { ...newQuerySpec(), text: "replayed" });
  render(wrap(<SingleQuery name="docs" />));
  await waitFor(() =>
    expect(q).toHaveBeenCalledWith("docs", expect.objectContaining({ query_text: "replayed" })),
  );
  expect(screen.getByLabelText(/query text/i)).toHaveValue("replayed");
});

test("a replayed vector-mode spec is not clobbered back to text mode once the details fetch (whose smart default is text) resolves", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS); // dim 384, default EF -> smart default is text
  const vector = JSON.stringify(Array(384).fill(0.1));
  const q = vi.spyOn(api, "query").mockResolvedValue({ hits: [] });
  requestReplay("docs", { ...newQuerySpec(), mode: "vector", vector });
  render(wrap(<SingleQuery name="docs" />));
  await waitFor(() =>
    expect(q).toHaveBeenCalledWith("docs", expect.objectContaining({ query_embedding: Array(384).fill(0.1) })),
  );
  // By now the details/embedders fetches (and the smart-default effect they
  // drive, whose default for this collection is text) have settled too -
  // confirm the form is still in Vector mode, not clobbered back to text.
  expect(screen.getByLabelText(/query vector/i)).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: /^vector$/i })).toHaveAttribute("aria-selected", "true");
});

test("a replay requested while mounted runs immediately", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const q = vi.spyOn(api, "query").mockResolvedValue({ hits: [] });
  render(wrap(<SingleQuery name="docs" />));
  await screen.findByLabelText(/query text/i);
  act(() => requestReplay("docs", { ...newQuerySpec(), text: "live replay" }));
  await waitFor(() =>
    expect(q).toHaveBeenCalledWith("docs", expect.objectContaining({ query_text: "live replay" })),
  );
});
