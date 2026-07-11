import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { CollectionsList } from "./CollectionsList";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactNode) {
  // retry: false - a rejected fetch must surface as an error immediately
  // instead of burning three background attempts (and the test's timeout).
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

test("renders collection name and count", async () => {
  vi.spyOn(api, "listCollections").mockResolvedValue([{ name: "docs", count: 3 }]);
  render(wrap(<CollectionsList selected={null} onSelect={() => {}} />));
  await waitFor(() => expect(screen.getByText(/docs/)).toBeInTheDocument());
  expect(screen.getByText(/3/)).toBeInTheDocument();
});

test("shows a skeleton while collections load", () => {
  vi.spyOn(api, "listCollections").mockReturnValue(new Promise(() => {}));
  render(wrap(<CollectionsList selected={null} onSelect={() => {}} />));
  expect(screen.getByRole("status", { name: /loading collections/i })).toBeInTheDocument();
});

test("a failed collections load offers retry", async () => {
  const spy = vi
    .spyOn(api, "listCollections")
    .mockRejectedValueOnce(new Error("boom"))
    .mockResolvedValueOnce([{ name: "docs", count: 3 }]);
  render(wrap(<CollectionsList selected={null} onSelect={() => {}} />));
  await screen.findByRole("alert");
  await userEvent.click(screen.getByRole("button", { name: /retry/i }));
  expect(await screen.findByText("docs")).toBeInTheDocument();
  expect(spy).toHaveBeenCalledTimes(2);
});
