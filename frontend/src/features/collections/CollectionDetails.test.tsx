import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  render(wrap(<CollectionDetails name="docs" onRenamed={() => {}} onDeleted={() => {}} />));
  await waitFor(() => expect(screen.getByText(/384/)).toBeInTheDocument());
  expect(screen.getByText(/l2/)).toBeInTheDocument();
  expect(screen.getByText(/default/)).toBeInTheDocument();
});

test("delete is gated on typing the collection name", async () => {
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const del = vi.spyOn(api, "deleteCollection").mockResolvedValue(undefined);
  const onDeleted = vi.fn();
  render(wrap(<CollectionDetails name="docs" onRenamed={() => {}} onDeleted={onDeleted} />));
  await waitFor(() => screen.getByText(/384/));
  const deleteBtn = screen.getByRole("button", { name: /^delete$/i });
  expect(deleteBtn).toBeDisabled();
  await userEvent.type(screen.getByLabelText(/type the name/i), "docs");
  expect(deleteBtn).toBeEnabled();
  await userEvent.click(deleteBtn);
  await waitFor(() => expect(del).toHaveBeenCalledWith("docs"));
  await waitFor(() => expect(onDeleted).toHaveBeenCalled());
});
