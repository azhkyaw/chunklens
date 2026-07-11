import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const DETAILS = {
  name: "docs", count: 3, dimensionality: 384,
  distance_metric: "l2", embedding_function: "default", metadata: {},
};

function renderManage(props: {
  name: string;
  onRenamed?: (n: string) => void;
  onDeleted?: () => void;
  qc?: QueryClient;
}) {
  const qc = props.qc ?? new QueryClient();
  function Harness() {
    const [open, setOpen] = useState(false);
    // App mounts CollectionManage WITHOUT a `key`, so a rename does not remount
    // it - only the `name` prop swaps. Model that here: onRenamed feeds the new
    // name straight back in as a prop change.
    const [name, setName] = useState(props.name);
    return (
      <CollectionManage
        name={name}
        open={open}
        onOpenChange={setOpen}
        onRenamed={(n) => {
          setName(n);
          props.onRenamed?.(n);
        }}
        onDeleted={props.onDeleted ?? (() => {})}
      />
    );
  }
  render(
    <QueryClientProvider client={qc}>
      <Harness />
    </QueryClientProvider>,
  );
  return qc;
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

// audit M-3: the hydration effect re-seeds `metaText` from `data` on every new
// object reference. A background refetch (refetchOnWindowFocus is on by
// default) landing while the user is mid-edit would silently wipe what they
// typed.
//
// The production trigger is a SIBLING field changing, NOT identical bytes
// arriving twice: structural sharing (query-core's replaceEqualDeep, on by
// default) hands back the PRIOR object whenever the new payload is deep-equal,
// and the fetch-success path goes through the same replaceData, so a
// byte-identical refetch never changes `data`'s identity. But replaceEqualDeep
// returns a NEW top-level object as soon as ANY field differs, and
// CollectionDetails carries `count`/`dimensionality` - which move whenever
// anything writes the collection (an ingest script in another terminal, the
// ImportPanel, another tab). Open Manage, start editing metadata, alt-tab to
// the indexer, come back: focus-refetch, count 3 -> 4, new reference, edit
// gone, even though `metadata` itself never moved. That is what this simulates,
// on the DEFAULT QueryClient so the identity change is one production can
// actually produce.
test("a details refetch does not clobber an in-progress metadata edit", async () => {
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  renderManage({ name: "docs", qc });
  await userEvent.click(screen.getByRole("button", { name: /^manage$/i }));
  const editor = await screen.findByRole("textbox", { name: /collection metadata/i });
  await waitFor(() => expect(editor).toHaveValue("{}")); // hydrated from the server
  fireEvent.change(editor, { target: { value: '{"draft":1}' } });
  // notifyManager schedules observer notifications via a real setTimeout(0)
  // (see query-core's timeoutManager), so the update must be flushed past that
  // macrotask - a synchronous act() would let this assertion pass for the wrong
  // reason (the re-render simply hasn't happened yet).
  await act(async () => {
    qc.setQueryData(["collection", "docs"], { ...DETAILS, count: 4 });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(editor).toHaveValue('{"draft":1}');
});

// audit M-3 follow-up: clearing the dirty flag on save re-runs the reseed
// effect, so the cache MUST already hold the saved details by then. Otherwise
// the editor reverts to the pre-save metadata the moment the toast fires, and a
// second Save click PUTs that stale value, destroying the metadata server-side.
test("a successful metadata save leaves the saved metadata in the editor", async () => {
  vi.spyOn(api, "getCollectionDetails").mockResolvedValue(DETAILS);
  const saved = { ...DETAILS, metadata: { a: 1 } };
  vi.spyOn(api, "updateCollection").mockResolvedValue(saved);
  const qc = renderManage({ name: "docs" });
  await userEvent.click(screen.getByRole("button", { name: /^manage$/i }));
  const box = await screen.findByRole("textbox", { name: /collection metadata/i });
  await waitFor(() => expect(box).toHaveValue("{}"));
  fireEvent.change(box, { target: { value: '{"a":1}' } });
  await userEvent.click(screen.getByRole("button", { name: /^save metadata$/i }));
  await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Collection metadata saved"));
  await waitFor(() => expect(box).toHaveValue(JSON.stringify({ a: 1 }, null, 2)));
  expect(qc.getQueryData(["collection", "docs"])).toEqual(saved);
});

// audit M-3 follow-up: a rename swaps the `name` prop without remounting, so an
// abandoned metadata edit (and its dirty flag) would otherwise ride along and
// pin the editor to the OLD collection's text - which "Save metadata" would
// then write onto the renamed collection.
test("renaming drops an abandoned metadata edit and reseeds from the new collection", async () => {
  const renamed = { ...DETAILS, name: "newname", metadata: { owner: "kai" } };
  vi.spyOn(api, "getCollectionDetails").mockImplementation(async (n: string) =>
    (n === "docs" ? DETAILS : renamed));
  vi.spyOn(api, "updateCollection").mockResolvedValue(renamed);
  renderManage({ name: "docs" });
  await userEvent.click(screen.getByRole("button", { name: /^manage$/i }));
  const box = await screen.findByRole("textbox", { name: /collection metadata/i });
  await waitFor(() => expect(box).toHaveValue("{}"));
  fireEvent.change(box, { target: { value: '{"junk":1}' } }); // abandoned mid-edit

  const input = screen.getByLabelText(/^rename$/i);
  await userEvent.clear(input);
  await userEvent.type(input, "newname");
  await userEvent.click(screen.getByRole("button", { name: /^save name$/i }));
  await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Renamed to newname"));

  await userEvent.click(screen.getByRole("button", { name: /^manage$/i }));
  const reopened = await screen.findByRole("textbox", { name: /collection metadata/i });
  await waitFor(() =>
    expect(reopened).toHaveValue(JSON.stringify(renamed.metadata, null, 2)),
  );
});
