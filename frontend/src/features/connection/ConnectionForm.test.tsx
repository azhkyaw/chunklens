import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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
  await userEvent.click(screen.getByRole("button", { name: /save/i }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toEqual({
    host: "remote", port: 8000, ssl: false,
    tenant: "tenant-x", database: "default_database", auth_mode: "none",
  });
});

test("Test button shows a result", async () => {
  vi.spyOn(api, "getConnection").mockResolvedValue(INFO);
  vi.spyOn(api, "testConnection").mockResolvedValue({ ok: true });
  render(wrap(<ConnectionForm />));
  await userEvent.click(screen.getByRole("button", { name: /test/i }));
  expect(await screen.findByText(/connection ok/i)).toBeInTheDocument();
});
