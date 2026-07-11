import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "../../api/client";
import { SelectionProvider, useSelection, type Selection } from "../../lib/selection";
import { Inspector } from "./Inspector";
import { toastSuccess } from "../../ui/toast";

vi.mock("../../ui/toast", () => ({
  AppToaster: () => null,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

// Sets a selection on mount so tests can drive the inspector directly.
function Select({ to }: { to: Selection }) {
  const { select } = useSelection();
  useEffect(() => {
    select(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderInspector(
  selection?: Selection,
  qc: QueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  // retry: false - a rejected fetch (see the raw-JSON error test) must settle
  // to its error state promptly instead of burning through react-query's
  // default retry/backoff schedule and timing out the test.
  render(
    <QueryClientProvider client={qc}>
      <SelectionProvider resetKey="docs/records">
        {selection && <Select to={selection} />}
        <Inspector collection="docs" />
      </SelectionProvider>
    </QueryClientProvider>,
  );
  return qc;
}

const REC: Selection = {
  kind: "record",
  record: { id: "r1", document: "alpha doc", metadata: { lang: "en" } },
};

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

const CONN = {
  host: "localhost", port: 8000, ssl: false,
  tenant: "default_tenant", database: "default_database",
  auth_mode: "none" as const, has_token: false,
};

const HIT: Selection = {
  kind: "hit",
  hit: { id: "h1", document: "beta doc", metadata: null, distance: 0.2 },
  rank: 1,
  metric: "cosine",
};

test("nothing selected shows the idle state", () => {
  renderInspector();
  expect(screen.getByText("nothing selected")).toBeInTheDocument();
  expect(screen.getByText(/select a row · j\/k to navigate/)).toBeInTheDocument();
});

test("a selected record shows id, document, metadata, and the embedding preview", async () => {
  vi.spyOn(api, "getRecord").mockResolvedValue({
    id: "r1", document: "alpha doc", metadata: { lang: "en" },
    embedding: [0.1234567, -0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
  });
  renderInspector(REC);
  expect(await screen.findByText("r1")).toBeInTheDocument();
  expect(screen.getByText("alpha doc")).toBeInTheDocument();
  expect(screen.getByText("lang")).toBeInTheDocument();
  expect(await screen.findByText("dim 9")).toBeInTheDocument();
  // First 8 dims, 4 decimals, then an ellipsis for the rest.
  expect(screen.getByText(/0\.1235, -0\.2500/)).toBeInTheDocument();
  expect(screen.getByText(/…\]$/)).toBeInTheDocument();
});

test("a record without a stored embedding says so", async () => {
  vi.spyOn(api, "getRecord").mockResolvedValue({
    id: "r1", document: "alpha doc", metadata: null, embedding: null,
  });
  renderInspector(REC);
  expect(await screen.findByText(/no stored embedding/i)).toBeInTheDocument();
});

test("metadata edits save from the inspector", async () => {
  vi.spyOn(api, "getRecord").mockResolvedValue({
    id: "r1", document: "alpha doc", metadata: { lang: "en" }, embedding: [1, 0],
  });
  const upd = vi.spyOn(api, "updateRecordMetadata").mockResolvedValue({
    id: "r1", document: "alpha doc", metadata: { lang: "de" },
  });
  const qc = renderInspector(REC);
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries");
  await userEvent.click(await screen.findByRole("button", { name: /^edit$/i }));
  const box = screen.getByRole("textbox", { name: /record metadata/i });
  // fireEvent.change sets the controlled textarea value directly - robust for
  // JSON braces (userEvent.type would need brace-escaping).
  fireEvent.change(box, { target: { value: '{"lang":"de"}' } });
  await userEvent.click(screen.getByRole("button", { name: /^save$/i }));
  await waitFor(() => expect(upd).toHaveBeenCalledWith("docs", "r1", { metadata: { lang: "de" } }));
  // The inspector reflects the saved metadata without a reselect.
  expect(await screen.findByText("de")).toBeInTheDocument();
  expect(toastSuccess).toHaveBeenCalledWith("Metadata saved");
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["records", "docs"] });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["source-records", "docs"] });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["record", "docs", "r1"] });
  // metadata-keys and sources are both derived from record metadata (audit L-5):
  // an edit can add a new key or move the record between by-document groups.
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["metadata-keys", "docs"] });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["sources", "docs"] });
});

test("invalid metadata JSON shows an error and does not save", async () => {
  vi.spyOn(api, "getRecord").mockResolvedValue({
    id: "r1", document: "alpha doc", metadata: { lang: "en" }, embedding: [1, 0],
  });
  const upd = vi.spyOn(api, "updateRecordMetadata").mockResolvedValue({
    id: "r1", document: "alpha doc", metadata: {},
  });
  renderInspector(REC);
  await userEvent.click(await screen.findByRole("button", { name: /^edit$/i }));
  fireEvent.change(screen.getByRole("textbox", { name: /record metadata/i }), {
    target: { value: '{"nested": {"x": 1}}' },
  });
  await userEvent.click(screen.getByRole("button", { name: /^save$/i }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(upd).not.toHaveBeenCalled();
});

test("a selected hit shows rank, score, and compare context", async () => {
  vi.spyOn(api, "getRecord").mockResolvedValue({
    id: "h1", document: "beta doc", metadata: null, embedding: [1, 0],
  });
  renderInspector({
    kind: "hit",
    hit: { id: "h1", document: "beta doc", metadata: { src: "b.pdf" }, distance: 0.09 },
    rank: 2,
    metric: "cosine",
    side: "B",
    delta: 1,
  });
  expect(await screen.findByText("h1")).toBeInTheDocument();
  expect(screen.getByText("#2")).toBeInTheDocument();
  expect(screen.getByText("0.91")).toBeInTheDocument(); // cosine similarity = 1 - 0.09
  expect(screen.getByText(/query b/i)).toBeInTheDocument();
  expect(screen.getByText(/▲1/)).toBeInTheDocument();
});

test("a selected source shows its summary", () => {
  renderInspector({ kind: "source", sourceKey: "source", value: "a.pdf", count: 7 });
  expect(screen.getByText("a.pdf")).toBeInTheDocument();
  expect(screen.getByText("source")).toBeInTheDocument();
  expect(screen.getByText("7")).toBeInTheDocument();
});

test("the action row copies a runnable Python get snippet for the selected record", async () => {
  const writeText = stubClipboard();
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "getRecord").mockResolvedValue({ id: "r1", document: "alpha doc", metadata: null, embedding: [1, 0] });
  renderInspector(REC);
  await userEvent.click(await screen.findByRole("button", { name: /copy as python/i }));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  const snippet = writeText.mock.calls[0][0] as string;
  expect(snippet).toContain('chromadb.HttpClient(host="localhost", port=8000)');
  expect(snippet).toContain('collection.get(ids=["r1"]');
});

test("the action row copies a JS get snippet", async () => {
  const writeText = stubClipboard();
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "getRecord").mockResolvedValue({ id: "r1", document: "alpha doc", metadata: null, embedding: [1, 0] });
  renderInspector(REC);
  await userEvent.click(await screen.findByRole("button", { name: /copy as js/i }));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  expect(writeText.mock.calls[0][0]).toContain("new ChromaClient({ host:");
});

test("raw JSON replaces the pretty sections with the full fetched record", async () => {
  stubClipboard();
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "getRecord").mockResolvedValue({
    id: "r1", document: "alpha doc", metadata: { lang: "en" }, embedding: [1, 0],
  });
  renderInspector(REC);
  await screen.findByText("r1");
  const toggle = screen.getByRole("button", { name: /^raw json$/i });
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-pressed", "true");
  const pre = await screen.findByTestId("inspector-raw");
  expect(pre.textContent).toContain('"embedding"');
  expect(pre.textContent).toContain('"lang": "en"');
  // pretty view is replaced, not duplicated
  expect(screen.queryByText(/^Document$/)).not.toBeInTheDocument();
});

test("raw JSON shows a failure alert and the partial payload when the full record fetch errors", async () => {
  stubClipboard();
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "getRecord").mockRejectedValue(new Error("boom"));
  renderInspector(REC);
  await screen.findByText("r1");
  await userEvent.click(screen.getByRole("button", { name: /^raw json$/i }));
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toMatch(/could not be loaded|failed to load/i);
  expect(alert.textContent).toMatch(/partial/i);
  // still shows the partial (list-row) payload - it's useful, just no longer
  // silently presented as the complete record.
  const pre = await screen.findByTestId("inspector-raw");
  expect(pre.textContent).toContain('"id": "r1"');
  expect(pre.textContent).not.toContain('"embedding"');
});

test("raw JSON of a hit shows the query hit payload without a fetch of its own", async () => {
  stubClipboard();
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  const getRecord = vi.spyOn(api, "getRecord").mockResolvedValue({ id: "h1", document: "beta doc", metadata: null, embedding: null });
  renderInspector(HIT);
  // A hit starts in the pretty view, whose EmbeddingBlock fetches the full
  // record by id for EITHER a record or a hit selection (it is the source of
  // the embedding preview, unrelated to raw/pretty). Let that settle first so
  // it is not mistaken for a fetch caused by the raw view itself.
  await waitFor(() => expect(getRecord).toHaveBeenCalledTimes(1));
  getRecord.mockClear();
  await userEvent.click(screen.getByRole("button", { name: /^raw json$/i }));
  const pre = await screen.findByTestId("inspector-raw");
  expect(pre.textContent).toContain('"distance": 0.2');
  // a hit's raw view is exactly the query response payload (selection.hit) -
  // raw and pretty are exclusive branches (EmbeddingBlock unmounts once raw
  // is on), so toggling to raw causes no fetch of its own.
  expect(pre.textContent).not.toContain('"embedding"');
  expect(getRecord).not.toHaveBeenCalled();
});

test("copy JSON copies the raw payload", async () => {
  const writeText = stubClipboard();
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "getRecord").mockResolvedValue({ id: "r1", document: "alpha doc", metadata: null, embedding: [1, 0] });
  renderInspector(REC);
  await userEvent.click(await screen.findByRole("button", { name: /^raw json$/i }));
  await screen.findByTestId("inspector-raw");
  await userEvent.click(screen.getByRole("button", { name: /copy json/i }));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  expect(writeText.mock.calls[0][0]).toContain('"id": "r1"');
});

test("copy vector copies the full embedding array", async () => {
  const writeText = stubClipboard();
  vi.spyOn(api, "getConnection").mockResolvedValue(CONN);
  vi.spyOn(api, "getRecord").mockResolvedValue({ id: "r1", document: "alpha doc", metadata: null, embedding: [0.25, -0.5] });
  renderInspector(REC);
  await userEvent.click(await screen.findByRole("button", { name: /copy vector/i }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("[0.25,-0.5]"));
});
