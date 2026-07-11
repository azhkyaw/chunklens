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

function renderInspector(selection?: Selection) {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <SelectionProvider resetKey="docs/records">
        {selection && <Select to={selection} />}
        <Inspector collection="docs" />
      </SelectionProvider>
    </QueryClientProvider>,
  );
}

const REC: Selection = {
  kind: "record",
  record: { id: "r1", document: "alpha doc", metadata: { lang: "en" } },
};

test("nothing selected shows the idle state", () => {
  renderInspector();
  expect(screen.getByText(/select a row/i)).toBeInTheDocument();
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
  renderInspector(REC);
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
