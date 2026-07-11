import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { api } from "../../api/client";
import { SelectionProvider } from "../../lib/selection";
import { RecordsTable } from "./RecordsTable";

afterEach(() => vi.restoreAllMocks());

function renderTable(path = "/c/docs/records") {
  const { hook, history } = memoryLocation({ path, record: true });
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <Router hook={hook}>
        <SelectionProvider resetKey="docs/records">
          <RecordsTable name="docs" />
        </SelectionProvider>
      </Router>
    </QueryClientProvider>,
  );
  return { history };
}

const PAGE_1 = {
  items: [
    { id: "a", document: "alpha doc", metadata: { lang: "en" } },
    { id: "b", document: "beta doc", metadata: { lang: "fr" } },
  ],
  limit: 25,
  offset: 0,
  total: 30,
};

test("renders record ids and document text", async () => {
  vi.spyOn(api, "getRecords").mockResolvedValue(PAGE_1);
  renderTable();
  await waitFor(() => expect(screen.getByText("a")).toBeInTheDocument());
  expect(screen.getByText("alpha doc")).toBeInTheDocument();
});

test("clicking a row selects it and writes sel to the URL", async () => {
  vi.spyOn(api, "getRecords").mockResolvedValue(PAGE_1);
  const { history } = renderTable();
  const row = await screen.findByRole("row", { name: /alpha doc/ });
  await userEvent.click(row);
  expect(row).toHaveAttribute("aria-selected", "true");
  expect(history[history.length - 1]).toBe("/c/docs/records?sel=a");
});

test("a row is keyboard-selectable with Enter", async () => {
  vi.spyOn(api, "getRecords").mockResolvedValue(PAGE_1);
  renderTable();
  const row = await screen.findByRole("row", { name: /beta doc/ });
  row.focus();
  await userEvent.keyboard("{Enter}");
  expect(row).toHaveAttribute("aria-selected", "true");
});

test("a sel deep link restores the selection once the page loads", async () => {
  vi.spyOn(api, "getRecords").mockResolvedValue(PAGE_1);
  renderTable("/c/docs/records?sel=b");
  const row = await screen.findByRole("row", { name: /beta doc/ });
  await waitFor(() => expect(row).toHaveAttribute("aria-selected", "true"));
});

test("paging writes offset to the URL and fetches that page", async () => {
  const recSpy = vi
    .spyOn(api, "getRecords")
    .mockImplementation(async (_name, limit = 25, offset = 0) => ({
      items: [{ id: `r${offset}`, document: "d", metadata: null }],
      limit,
      offset,
      total: 30,
    }));
  const { history } = renderTable();
  await screen.findByText("r0");
  await userEvent.click(screen.getByRole("button", { name: /^next$/i }));
  expect(await screen.findByText("26–30 of 30")).toBeInTheDocument();
  expect(recSpy).toHaveBeenCalledWith("docs", 25, 25);
  expect(history[history.length - 1]).toBe("/c/docs/records?offset=25");
  // Prev returns to page one and drops the param. (Tolerate a bare trailing
  // "?" - wouter's setter may leave one when the last param is deleted.)
  await userEvent.click(screen.getByRole("button", { name: /^prev$/i }));
  expect(await screen.findByText("1–25 of 30")).toBeInTheDocument();
  expect(history[history.length - 1]).toMatch(/^\/c\/docs\/records\??$/);
});

test("an offset deep link loads that page", async () => {
  const recSpy = vi
    .spyOn(api, "getRecords")
    .mockImplementation(async (_name, limit = 25, offset = 0) => ({
      items: [{ id: `r${offset}`, document: "d", metadata: null }],
      limit,
      offset,
      total: 30,
    }));
  renderTable("/c/docs/records?offset=25");
  expect(await screen.findByText("26–30 of 30")).toBeInTheDocument();
  expect(recSpy).toHaveBeenCalledWith("docs", 25, 25);
});

test("a garbage offset param falls back to page one", async () => {
  const recSpy = vi.spyOn(api, "getRecords").mockResolvedValue(PAGE_1);
  renderTable("/c/docs/records?offset=bogus");
  await screen.findByText("a");
  expect(recSpy).toHaveBeenCalledWith("docs", 25, 0);
});

test("there is no per-row Edit button anymore (editing lives in the inspector)", async () => {
  vi.spyOn(api, "getRecords").mockResolvedValue(PAGE_1);
  renderTable();
  await screen.findByText("a");
  expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
});

test("j and k move the row selection", async () => {
  vi.spyOn(api, "getRecords").mockResolvedValue(PAGE_1);
  renderTable();
  await screen.findByRole("grid");
  const rowNamed = (id: string) => screen.getByRole("row", { name: new RegExp(`^${id}\\b`) });
  fireEvent.keyDown(window, { key: "j" });
  expect(rowNamed("a")).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(window, { key: "j" });
  expect(rowNamed("b")).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(window, { key: "j" }); // clamped at the end
  expect(rowNamed("b")).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(window, { key: "k" });
  expect(rowNamed("a")).toHaveAttribute("aria-selected", "true");
});

test("switches to the By document view", async () => {
  vi.spyOn(api, "getRecords").mockResolvedValue(PAGE_1);
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({
    keys: [{ key: "source", types: ["string"] }],
    sampled: 1,
    total: 1,
  });
  vi.spyOn(api, "listSources").mockResolvedValue({
    key: "source",
    sources: [{ value: "a.pdf", count: 1 }],
    scanned: 1,
    total: 1,
  });
  renderTable();
  await screen.findByText("alpha doc");
  await userEvent.click(screen.getByRole("tab", { name: /by document/i }));
  expect(await screen.findByText("a.pdf")).toBeInTheDocument();
});
