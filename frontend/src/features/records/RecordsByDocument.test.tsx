import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { RecordsByDocument } from "./RecordsByDocument";
import { api } from "../../api/client";
import { SelectionProvider, useSelection } from "../../lib/selection";

afterEach(() => vi.restoreAllMocks());

function SelectionProbe() {
  const { selection } = useSelection();
  if (!selection) return <output data-testid="probe">none</output>;
  if (selection.kind === "source")
    return <output data-testid="probe">source:{selection.value}:{selection.count}</output>;
  if (selection.kind === "record")
    return <output data-testid="probe">record:{selection.record.id}</output>;
  return <output data-testid="probe">{selection.kind}</output>;
}

function wrap(ui: React.ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <SelectionProvider resetKey="docs/records">
        {ui}
        <SelectionProbe />
      </SelectionProvider>
    </QueryClientProvider>
  );
}

test("auto-detects a string provenance key and lists documents with counts", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({
    keys: [{ key: "page", types: ["int"] }, { key: "source", types: ["string"] }], sampled: 5, total: 5,
  });
  const srcSpy = vi.spyOn(api, "listSources").mockResolvedValue({
    key: "source", sources: [{ value: "a.pdf", count: 3 }, { value: "b.pdf", count: 1 }], scanned: 4, total: 4,
  });
  render(wrap(<RecordsByDocument name="docs" />));
  await waitFor(() => expect(screen.getByText("a.pdf")).toBeInTheDocument());
  expect(screen.getByText(/3 chunks/)).toBeInTheDocument();
  expect(srcSpy).toHaveBeenCalledWith("docs", "source"); // chose the string provenance key, not int "page"
});

test("expanding a document fetches and shows its chunks", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [{ key: "source", types: ["string"] }], sampled: 1, total: 1 });
  vi.spyOn(api, "listSources").mockResolvedValue({ key: "source", sources: [{ value: "a.pdf", count: 1 }], scanned: 1, total: 1 });
  const recSpy = vi.spyOn(api, "getSourceRecords").mockResolvedValue({
    items: [{ id: "c1", document: "chunk", metadata: { source: "a.pdf" } }], limit: 25, offset: 0, total: 1,
  });
  render(wrap(<RecordsByDocument name="docs" />));
  await userEvent.click(await screen.findByRole("button", { name: /a\.pdf/i }));
  await waitFor(() => expect(recSpy).toHaveBeenCalledWith("docs", "source", "a.pdf", 25, 0));
  expect(await screen.findByText("c1")).toBeInTheDocument();
});

test("the (none) bucket is not expandable", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [{ key: "source", types: ["string"] }], sampled: 1, total: 1 });
  vi.spyOn(api, "listSources").mockResolvedValue({ key: "source", sources: [{ value: "(none)", count: 2 }], scanned: 2, total: 2 });
  render(wrap(<RecordsByDocument name="docs" />));
  expect(await screen.findByRole("button", { name: /\(none\)/ })).toBeDisabled();
});

test("an empty-string bucket is labeled (empty) and is not expandable", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [{ key: "source", types: ["string"] }], sampled: 1, total: 1 });
  vi.spyOn(api, "listSources").mockResolvedValue({ key: "source", sources: [{ value: "", count: 2 }], scanned: 2, total: 2 });
  render(wrap(<RecordsByDocument name="docs" />));
  expect(await screen.findByRole("button", { name: /\(empty\)/ })).toBeDisabled();
});

test("mixed-type key is excluded; only the purely-string key is chosen as auto key", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({
    keys: [{ key: "mixed", types: ["int", "string"] }, { key: "source", types: ["string"] }],
    sampled: 5, total: 5,
  });
  const srcSpy = vi.spyOn(api, "listSources").mockResolvedValue({
    key: "source", sources: [{ value: "a.pdf", count: 2 }], scanned: 5, total: 5,
  });
  render(wrap(<RecordsByDocument name="docs" />));
  await waitFor(() => expect(srcSpy).toHaveBeenCalledWith("docs", "source"));
  expect(srcSpy).not.toHaveBeenCalledWith("docs", "mixed");
});

test("auto-detect prefers a high-priority provenance key (source) over a lower one (doc_id) regardless of key order", async () => {
  // Mirrors a real RAG collection: keys arrive alphabetically, so doc_id precedes source -
  // but source must win because it ranks higher in PROVENANCE_KEYS, not because it sorts later.
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({
    keys: [
      { key: "allowed_roles", types: ["string"] },
      { key: "doc_id", types: ["string"] },
      { key: "section", types: ["string"] },
      { key: "source", types: ["string"] },
    ],
    sampled: 14, total: 14,
  });
  const srcSpy = vi.spyOn(api, "listSources").mockResolvedValue({
    key: "source", sources: [{ value: "employee-handbook.md", count: 14 }], scanned: 14, total: 14,
  });
  render(wrap(<RecordsByDocument name="docs" />));
  await waitFor(() => expect(srcSpy).toHaveBeenCalledWith("docs", "source"));
  expect(srcSpy).not.toHaveBeenCalledWith("docs", "doc_id");
});

test("clicking a document group selects its source summary", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({
    keys: [{ key: "source", types: ["string"] }], sampled: 1, total: 1,
  });
  vi.spyOn(api, "listSources").mockResolvedValue({
    key: "source", sources: [{ value: "a.pdf", count: 3 }], scanned: 3, total: 3,
  });
  vi.spyOn(api, "getSourceRecords").mockResolvedValue({
    items: [], limit: 25, offset: 0, total: 0,
  });
  render(wrap(<RecordsByDocument name="docs" />));
  await userEvent.click(await screen.findByRole("button", { name: /a\.pdf/i }));
  expect(screen.getByTestId("probe")).toHaveTextContent("source:a.pdf:3");
});
