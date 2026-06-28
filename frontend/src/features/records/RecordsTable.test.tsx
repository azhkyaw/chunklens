import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { RecordsTable } from "./RecordsTable";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

test("renders record ids and document text", async () => {
  vi.spyOn(api, "getRecords").mockResolvedValue({
    items: [{ id: "a", document: "alpha doc", metadata: { lang: "en" } }],
    limit: 25,
    offset: 0,
    total: 1,
  });
  render(wrap(<RecordsTable name="docs" />));
  await waitFor(() => expect(screen.getByText("a")).toBeInTheDocument());
  expect(screen.getByText("alpha doc")).toBeInTheDocument();
});

test("edits a record's metadata", async () => {
  vi.spyOn(api, "getRecords").mockResolvedValue({
    items: [{ id: "a", document: "alpha", metadata: { lang: "en" } }],
    limit: 25, offset: 0, total: 1,
  });
  const upd = vi.spyOn(api, "updateRecordMetadata").mockResolvedValue({
    id: "a", document: "alpha", metadata: { lang: "de" },
  });
  render(wrap(<RecordsTable name="docs" />));
  await waitFor(() => screen.getByText("alpha"));
  await userEvent.click(screen.getByRole("button", { name: /edit/i }));
  // Query by role: /record metadata/i also matches the dialog's aria-label
  // ("Edit record metadata"), so target the textbox specifically.
  const box = await screen.findByRole("textbox", { name: /record metadata/i });
  // fireEvent.change sets the controlled textarea value directly - robust for
  // JSON braces (userEvent.type would need brace-escaping and is fragile here).
  fireEvent.change(box, { target: { value: '{"lang":"de"}' } });
  await userEvent.click(screen.getByRole("button", { name: /^save$/i }));
  await waitFor(() => expect(upd).toHaveBeenCalledWith("docs", "a", { metadata: { lang: "de" } }));
});
