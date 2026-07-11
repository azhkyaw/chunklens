import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { DocChunks } from "./DocChunks";
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

test("clicking a chunk row selects that record", async () => {
  vi.spyOn(api, "getSourceRecords").mockResolvedValue({
    items: [{ id: "c1", document: "chunk one", metadata: { source: "a.pdf" } }],
    limit: 25, offset: 0, total: 1,
  });
  render(wrap(<DocChunks name="docs" sourceKey="source" value="a.pdf" />));
  const row = await screen.findByRole("row", { name: /chunk one/ });
  await userEvent.click(row);
  expect(row).toHaveAttribute("aria-selected", "true");
  expect(screen.getByTestId("probe")).toHaveTextContent("record:c1");
});
