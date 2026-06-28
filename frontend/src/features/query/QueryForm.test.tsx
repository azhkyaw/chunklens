import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { QueryForm } from "./QueryForm";
import { newQuerySpec } from "./querySpec";
import { api } from "../../api/client";

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
