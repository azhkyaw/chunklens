import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { RecordsByDocument } from "./RecordsByDocument";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());
function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
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
