import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { App } from "./App";
import { api } from "./api/client";

afterEach(() => vi.restoreAllMocks());

test("renders the app title", () => {
  vi.spyOn(api, "listCollections").mockResolvedValue([]);
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <App />
    </QueryClientProvider>,
  );
  expect(screen.getByText("ChunkLens")).toBeInTheDocument();
});
