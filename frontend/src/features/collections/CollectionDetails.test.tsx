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
  render(wrap(<CollectionDetails name="docs" />));
  await waitFor(() => expect(screen.getByText(/384/)).toBeInTheDocument());
  expect(screen.getByText(/l2/)).toBeInTheDocument();
  expect(screen.getByText(/default/)).toBeInTheDocument();
});

test("raw JSON toggles the details payload with a copy button", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  render(wrap(<CollectionDetails name="docs" />));
  const toggle = await screen.findByRole("button", { name: /^raw json$/i });
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByTestId("details-raw").textContent).toContain('"distance_metric"');
  await userEvent.click(screen.getByRole("button", { name: /copy json/i }));
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  expect(writeText.mock.calls[0][0]).toContain('"name"');
  await userEvent.click(toggle);
  expect(screen.queryByTestId("details-raw")).not.toBeInTheDocument();
});
