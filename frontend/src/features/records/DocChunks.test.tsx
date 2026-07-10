import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DocChunks } from "./DocChunks";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());
function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
}

test("renders a placeholder instead of crashing when the query is disabled (empty value)", () => {
  // A disabled, never-fetched TanStack v5 query has isLoading false and error null,
  // so the component must guard on missing data rather than assert it.
  const spy = vi.spyOn(api, "getSourceRecords").mockResolvedValue({ items: [], limit: 25, offset: 0, total: 0 });
  render(wrap(<DocChunks name="docs" sourceKey="source" value="" />));
  expect(screen.getByText(/loading chunks/i)).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});

test("fetches and renders the chunks for a source value", async () => {
  const spy = vi.spyOn(api, "getSourceRecords").mockResolvedValue({
    items: [{ id: "c1", document: "chunk one", metadata: { source: "a.pdf" } }],
    limit: 25, offset: 0, total: 1,
  });
  render(wrap(<DocChunks name="docs" sourceKey="source" value="a.pdf" />));
  await waitFor(() => expect(screen.getByText("c1")).toBeInTheDocument());
  expect(screen.getByText("chunk one")).toBeInTheDocument();
  expect(spy).toHaveBeenCalledWith("docs", "source", "a.pdf", 25, 0);
});
