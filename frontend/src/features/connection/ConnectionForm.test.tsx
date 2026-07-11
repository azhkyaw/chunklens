import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ConnectionForm } from "./ConnectionForm";
import { api } from "../../api/client";

afterEach(() => vi.restoreAllMocks());

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const INFO = {
  host: "localhost", port: 8000, ssl: false,
  tenant: "tenant-x", database: "default_database",
  auth_mode: "none" as const, has_token: false,
};

test("saves config and omits token when blank", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(INFO);
  const save = vi.spyOn(api, "saveConnection").mockResolvedValue({ ...INFO });
  render(wrap(<ConnectionForm />));
  // Wait until the form has hydrated from the server config before editing.
  // `tenant` differs from the component's built-in default, so observing it
  // confirms the hydration effect has run and won't fire again mid-edit (which
  // would otherwise clobber typed input). In the real app `info` is already
  // cached by ConnectionStatus, so the form hydrates on first render.
  await waitFor(() =>
    expect((screen.getByLabelText(/tenant/i) as HTMLInputElement).value).toBe("tenant-x"),
  );
  await userEvent.clear(screen.getByLabelText(/host/i));
  await userEvent.type(screen.getByLabelText(/host/i), "remote");
  await userEvent.click(screen.getByRole("button", { name: /^connect$/i }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toEqual({
    host: "remote", port: 8000, ssl: false,
    tenant: "tenant-x", database: "default_database", auth_mode: "none",
  });
});

test("Connect button shows aria-busy while saving", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(INFO);
  vi.spyOn(api, "saveConnection").mockReturnValue(new Promise(() => {}));
  render(wrap(<ConnectionForm />));
  await userEvent.click(screen.getByRole("button", { name: /^connect$/i }));
  expect(screen.getByRole("button", { name: /^connect$/i })).toHaveAttribute("aria-busy", "true");
});

test("Test button shows a result", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(INFO);
  vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  render(wrap(<ConnectionForm />));
  await userEvent.click(screen.getByRole("button", { name: /test/i }));
  expect(await screen.findByText(/connection ok/i)).toBeInTheDocument();
});

// audit M-3: refetchOnWindowFocus is on by default, so alt-tabbing to a
// password manager and back can land a background refetch mid-edit. The old
// hydration effect re-seeds on every new `info` object, even when its content
// is unchanged, wiping whatever the user had just typed.
//
// structuralSharing defaults to true, so a plain `setQueryData(key,
// {...sameContent})` would be deduped by TanStack Query itself and never
// actually change `info`'s identity (see query-core's replaceEqualDeep) -
// that would make this test pass for the wrong reason on both old and new
// code. Disabling structuralSharing here lets us push a genuinely new
// reference through, which is what a real refetch's queryFn result is
// BEFORE structural sharing dedupes it - i.e. exactly the identity the old
// effect (keyed on `[info]`) would react to.
test("a background refetch does not clobber in-progress edits", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(INFO);
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, structuralSharing: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <ConnectionForm />
    </QueryClientProvider>,
  );
  const host = await screen.findByLabelText(/host/i);
  await waitFor(() => expect(host).toHaveValue("localhost"));
  await userEvent.clear(host);
  await userEvent.type(host, "otherhost");
  // simulate a focus-refetch landing: same content, new object identity.
  // notifyManager schedules observer notifications via a real setTimeout(0)
  // (see query-core's timeoutManager), so the update must be flushed past
  // that macrotask - a synchronous act() would let this assertion pass for
  // the wrong reason (the re-render simply hasn't happened yet).
  await act(async () => {
    qc.setQueryData(["connection"], { ...INFO });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(host).toHaveValue("otherhost");
});
