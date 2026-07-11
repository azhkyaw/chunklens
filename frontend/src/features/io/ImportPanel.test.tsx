import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ImportPanel } from "./ImportPanel";
import { api } from "../../api/client";
import { toastSuccess } from "../../ui/toast";

vi.mock("../../ui/toast", () => ({
  AppToaster: () => null,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());
function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}
const FILE = new File(
  [JSON.stringify({
    chunklens_export: 1,
    collection: { name: "imp", distance_metric: "l2", embedding_function: "none", metadata: {} },
    records: [{ id: "a", embedding: [1, 2] }],
  })],
  "imp.chunklens.json",
  { type: "application/json" },
);

test("parses a file, prefills the name, and imports", async () => {
  vi.spyOn(api, "importCollection").mockResolvedValue({
    name: "imp", count: 1, dimensionality: 2, distance_metric: "l2", embedding_function: "none", metadata: {},
  });
  const onImported = vi.fn();
  render(wrap(<ImportPanel onImported={onImported} />));
  await userEvent.upload(screen.getByLabelText(/import file/i), FILE);
  await waitFor(() => expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe("imp"));
  await userEvent.click(screen.getByRole("button", { name: /^import$/i }));
  await waitFor(() => expect(api.importCollection).toHaveBeenCalled());
  expect(onImported).toHaveBeenCalledWith("imp");
  expect(toastSuccess).toHaveBeenCalledWith("Imported imp");
});

test("shows an error when the file is not JSON", async () => {
  render(wrap(<ImportPanel onImported={() => {}} />));
  const bad = new File(["not json"], "bad.json", { type: "application/json" });
  await userEvent.upload(screen.getByLabelText(/import file/i), bad);
  expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't read/i);
});
