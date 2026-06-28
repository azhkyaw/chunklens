import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { QueryPanel } from "./QueryPanel";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

test("runs a query and shows ranked hits with distance", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  vi.spyOn(api, "query").mockResolvedValue({
    hits: [{ id: "a", document: "alpha doc", metadata: null, distance: 0.0 }],
  });
  render(wrap(<QueryPanel name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "alpha");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  expect(await screen.findByText(/a - 0/)).toBeInTheDocument();
});

test("builds a metadata filter and sends it with the query", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [{ key: "lang", types: ["string"] }], sampled: 3, total: 3 });
  const run = vi.spyOn(api, "query").mockResolvedValue({ hits: [] });
  render(wrap(<QueryPanel name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "hello");
  // add a metadata condition via the Metadata filter builder (first "add condition")
  await userEvent.click(screen.getAllByRole("button", { name: /add condition/i })[0]);
  await userEvent.type(screen.getByLabelText(/^field$/i), "lang");
  await userEvent.type(screen.getByLabelText(/^value$/i), "en");
  await userEvent.click(screen.getByRole("button", { name: /^run$/i }));
  await waitFor(() => expect(run).toHaveBeenCalled());
  const body = run.mock.calls[0][1];
  expect(body.where).toEqual({ lang: { $eq: "en" } });
  expect(body.query_text).toBe("hello");
});
