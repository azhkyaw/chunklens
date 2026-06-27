import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { RecordsTable } from "./RecordsTable";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

test("renders record ids and document text", async () => {
  vi.spyOn(api, "getRecords").mockResolvedValue({
    items: [{ id: "a", document: "alpha doc", metadata: { lang: "en" } }],
    limit: 25,
    offset: 0,
    total: 1,
  });
  render(wrap(<RecordsTable name="docs" />));
  await waitFor(() => expect(screen.getByText("a")).toBeInTheDocument());
  expect(screen.getByText("alpha doc")).toBeInTheDocument();
});
