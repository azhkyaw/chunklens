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

test("runs a query and shows ranked hits with distance", async () => {
  vi.spyOn(api, "query").mockResolvedValue({
    hits: [{ id: "a", document: "alpha doc", metadata: null, distance: 0.0 }],
  });
  render(wrap(<QueryPanel name="docs" />));
  await userEvent.type(screen.getByLabelText(/query text/i), "alpha");
  await userEvent.click(screen.getByRole("button", { name: /run/i }));
  expect(await screen.findByText(/a - 0/)).toBeInTheDocument();
});
