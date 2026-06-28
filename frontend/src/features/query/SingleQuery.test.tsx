import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { SingleQuery } from "./SingleQuery";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());
function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}
const DETAILS = { name: "docs", count: 1, dimensionality: 2, distance_metric: "cosine", embedding_function: "default", metadata: {} };

test("runs a query and shows scored ranked hits", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "query").mockResolvedValue({ hits: [{ id: "doc_42", document: "alpha", metadata: null, distance: 0.09 }] });
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "alpha");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  expect(await screen.findByText("doc_42")).toBeInTheDocument();
  expect(screen.getByText("0.91")).toBeInTheDocument();          // cosine similarity
});

test("sends the built where filter with the query", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [{ key: "lang", types: ["string"] }], sampled: 3, total: 3 });
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const run = vi.spyOn(api, "query").mockResolvedValue({ hits: [] });
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "hello");
  await userEvent.click(screen.getAllByRole("button", { name: /add condition/i })[0]);
  await userEvent.type(screen.getByLabelText(/^field$/i), "lang");
  await userEvent.type(screen.getByLabelText(/^value$/i), "en");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  await waitFor(() => expect(run).toHaveBeenCalled());
  expect(run.mock.calls[0][1].where).toEqual({ lang: { $eq: "en" } });
});

test("blocks Run and shows a banner for text on a none-EF collection", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue({ name: "docs", count: 0, dimensionality: 3, distance_metric: "l2", embedding_function: "none", metadata: {} });
  render(wrap(<SingleQuery name="docs" />));
  await waitFor(() => expect(screen.getByText(/EF:/)).toBeInTheDocument());
  await userEvent.type(screen.getByLabelText(/query text/i), "hello");
  expect(screen.getByRole("button", { name: /^run$/i })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent(/no embedding function/i);
});

test("interprets a dimension-mismatch query error", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue({ name: "docs", count: 0, dimensionality: 384, distance_metric: "l2", embedding_function: "default", metadata: {} });
  vi.spyOn(api, "query").mockRejectedValue(new Error("embedding with dimension 384, got 2"));
  render(wrap(<SingleQuery name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "hello");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  expect(await screen.findByText(/dimensionality/i)).toBeInTheDocument();
});
