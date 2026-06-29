import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { CollectionDetails } from "./CollectionDetails";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const DETAILS = {
  name: "docs", count: 3, dimensionality: 384,
  distance_metric: "l2", embedding_function: "default", metadata: {},
};

test("shows the guard fields", async () => {
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  render(wrap(<CollectionDetails name="docs" />));
  await waitFor(() => expect(screen.getByText(/384/)).toBeInTheDocument());
  expect(screen.getByText(/l2/)).toBeInTheDocument();
  expect(screen.getByText(/default/)).toBeInTheDocument();
});
