import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { QueryForm } from "./QueryForm";
import { newQuerySpec } from "./querySpec";
import { api } from "../../api/client";
import type { CollectionDetails } from "../../api/types";

const details: CollectionDetails = {
  name: "c", count: 1, dimensionality: 3,
  distance_metric: "l2", embedding_function: "none", metadata: {},
};

afterEach(() => vi.restoreAllMocks());
function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

test("editing query text calls onChange with the updated spec", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  const onChange = vi.fn();
  render(wrap(<QueryForm name="docs" spec={newQuerySpec()} onChange={onChange} />));
  await userEvent.type(screen.getByLabelText(/query text/i), "x");
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ text: "x" }));
});

test("renders both filter builders", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  render(wrap(<QueryForm name="docs" spec={newQuerySpec()} onChange={() => {}} />));
  expect(screen.getByText(/Metadata filter \(where\)/)).toBeInTheDocument();
  expect(screen.getByText(/Document filter \(where_document\)/)).toBeInTheDocument();
});

test("vector mode shows the expected-dim hint and a wrong-length error", () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  const spec = { ...newQuerySpec(), mode: "vector" as const, vector: "[1, 2]" };
  render(wrap(<QueryForm name="c" spec={spec} details={details} onChange={() => {}} />));
  expect(screen.getByText(/expects 3-dim/i)).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(/expected.*got 2/i);
});

test("text mode shows the text input; toggling to Vector calls onChange", async () => {
  vi.spyOn(api, "getMetadataKeys").mockResolvedValue({ keys: [], sampled: 0, total: 0 });
  const onChange = vi.fn();
  render(wrap(<QueryForm name="c" spec={newQuerySpec()} details={details} onChange={onChange} />));
  expect(screen.getByLabelText(/query text/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: /^vector$/i }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ mode: "vector" }));
});
