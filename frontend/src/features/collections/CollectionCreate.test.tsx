import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { CollectionCreate } from "./CollectionCreate";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

test("submits the create form with metric and EF", async () => {
  const create = vi.spyOn(api, "createCollection").mockResolvedValue({
    name: "made", count: 0, dimensionality: null,
    distance_metric: "cosine", embedding_function: "none", metadata: {},
  });
  const onCreated = vi.fn();
  render(wrap(<CollectionCreate onCreated={onCreated} />));
  await userEvent.type(screen.getByLabelText(/name/i), "made");
  await userEvent.selectOptions(screen.getByLabelText(/distance/i), "cosine");
  await userEvent.selectOptions(screen.getByLabelText(/embedding/i), "none");
  await userEvent.click(screen.getByRole("button", { name: /create/i }));
  await waitFor(() => expect(create).toHaveBeenCalled());
  expect(create.mock.calls[0][0]).toMatchObject({
    name: "made", distance_metric: "cosine", embedding_function: "none",
  });
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith("made"));
});
