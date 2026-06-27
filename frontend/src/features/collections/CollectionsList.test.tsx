import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { CollectionsList } from "./CollectionsList";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

test("renders collection name and count", async () => {
  vi.spyOn(api, "listCollections").mockResolvedValue([{ name: "docs", count: 3 }]);
  render(wrap(<CollectionsList selected={null} onSelect={() => {}} />));
  await waitFor(() => expect(screen.getByText(/docs/)).toBeInTheDocument());
  expect(screen.getByText(/3/)).toBeInTheDocument();
});
