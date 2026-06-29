import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { CollectionManage } from "./CollectionManage";
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

test("opens a modal and gates delete on typing the collection name", async () => {
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const del = vi.spyOn(api, "deleteCollection").mockResolvedValue(undefined);
  const onDeleted = vi.fn();
  render(wrap(<CollectionManage name="docs" onRenamed={() => {}} onDeleted={onDeleted} />));

  // The form is mounted only once the modal opens (unlike the old <details>).
  expect(screen.queryByLabelText(/type the name/i)).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: /^manage$/i }));

  const deleteBtn = screen.getByRole("button", { name: /^delete$/i });
  expect(deleteBtn).toBeDisabled();
  await userEvent.type(screen.getByLabelText(/type the name/i), "docs");
  expect(deleteBtn).toBeEnabled();
  await userEvent.click(deleteBtn);
  await waitFor(() => expect(del).toHaveBeenCalledWith("docs"));
  await waitFor(() => expect(onDeleted).toHaveBeenCalled());
});
