import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { QueryPanel } from "./QueryPanel";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());
function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}
const DETAILS = { name: "docs", count: 0, dimensionality: null, distance_metric: "l2", embedding_function: "default", metadata: {} };

test("renders the single-query console", () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  render(wrap(<QueryPanel name="docs" />));
  expect(screen.getByLabelText(/query text/i)).toBeInTheDocument();
});

test("toggling to Compare shows two query inputs", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "listEmbedders").mockResolvedValue([]);
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  render(wrap(<QueryPanel name="docs" />));
  await userEvent.click(screen.getByRole("tab", { name: /compare/i }));
  expect(screen.getAllByLabelText(/query text/i)).toHaveLength(2);
});
