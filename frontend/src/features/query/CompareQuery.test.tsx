import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { CompareQuery } from "./CompareQuery";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());
function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}
const DETAILS = { name: "docs", count: 2, dimensionality: 384, distance_metric: "cosine", embedding_function: "default", metadata: {} };

test("runs both queries and renders a compare with only-A / only-B", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "query")
    .mockResolvedValueOnce({ hits: [{ id: "x", document: "x", metadata: null, distance: 0.1 }] })
    .mockResolvedValueOnce({ hits: [{ id: "z", document: "z", metadata: null, distance: 0.1 }] });
  render(wrap(<CompareQuery name="docs" />));
  const texts = screen.getAllByLabelText(/query text/i);
  await userEvent.type(texts[0], "aa");
  await userEvent.type(texts[1], "bb");
  await userEvent.click(screen.getByRole("button", { name: /run both/i }));
  await waitFor(() => expect(screen.getByText(/only A/i)).toBeInTheDocument());
  expect(screen.getByText(/only B/i)).toBeInTheDocument();
});
