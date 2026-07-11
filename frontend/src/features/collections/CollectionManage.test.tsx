import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { CollectionManage } from "./CollectionManage";
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

const DETAILS = {
  name: "docs", count: 3, dimensionality: 384,
  distance_metric: "l2", embedding_function: "default", metadata: {},
};

function renderManage(props: { name: string; onRenamed?: (n: string) => void; onDeleted?: () => void }) {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <CollectionManage
        name={props.name}
        open={open}
        onOpenChange={setOpen}
        onRenamed={props.onRenamed ?? (() => {})}
        onDeleted={props.onDeleted ?? (() => {})}
      />
    );
  }
  return render(wrap(<Harness />));
}

test("opens a modal and gates delete on typing the collection name", async () => {
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const del = vi.spyOn(api, "deleteCollection").mockResolvedValue(undefined);
  const onDeleted = vi.fn();
  renderManage({ name: "docs", onDeleted });

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
  expect(toastSuccess).toHaveBeenCalledWith("Deleted docs");
});

test("renaming toasts success", async () => {
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const upd = vi.spyOn(api, "updateCollection").mockResolvedValue({ ...DETAILS, name: "newname" });
  const onRenamed = vi.fn();
  renderManage({ name: "docs", onRenamed });
  await userEvent.click(screen.getByRole("button", { name: /^manage$/i }));
  const input = screen.getByLabelText(/^rename$/i);
  await userEvent.clear(input);
  await userEvent.type(input, "newname");
  await userEvent.click(screen.getByRole("button", { name: /^save name$/i }));
  await waitFor(() => expect(upd).toHaveBeenCalledWith("docs", { name: "newname" }));
  await waitFor(() => expect(onRenamed).toHaveBeenCalledWith("newname"));
  expect(toastSuccess).toHaveBeenCalledWith("Renamed to newname");
});

test("saving collection metadata toasts success", async () => {
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const upd = vi.spyOn(api, "updateCollection").mockResolvedValue(DETAILS);
  renderManage({ name: "docs" });
  await userEvent.click(screen.getByRole("button", { name: /^manage$/i }));
  const box = await screen.findByRole("textbox", { name: /collection metadata/i });
  fireEvent.change(box, { target: { value: '{"a":1}' } });
  await userEvent.click(screen.getByRole("button", { name: /^save metadata$/i }));
  await waitFor(() => expect(upd).toHaveBeenCalledWith("docs", { metadata: { a: 1 } }));
  expect(toastSuccess).toHaveBeenCalledWith("Collection metadata saved");
});

test("a failed delete shows an inline error", async () => {
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  vi.spyOn(api, "deleteCollection").mockRejectedValue(new Error("cannot delete"));
  renderManage({ name: "docs" });
  await userEvent.click(screen.getByRole("button", { name: /^manage$/i }));
  await userEvent.type(screen.getByLabelText(/type the name/i), "docs");
  await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/cannot delete/i);
});
