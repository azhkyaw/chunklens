import { afterEach, expect, test, vi } from "vitest";
import { api } from "./client";

afterEach(() => vi.restoreAllMocks());

test("listCollections calls /api/collections and returns json", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify([{ name: "docs", count: 3 }]), { status: 200 }),
    ),
  );
  const cols = await api.listCollections();
  expect(cols).toEqual([{ name: "docs", count: 3 }]);
  expect(fetch).toHaveBeenCalledWith("/api/collections", expect.any(Object));
});

test("non-ok response throws", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
  await expect(api.listCollections()).rejects.toThrow("500");
});

test("getConnection calls /api/connection", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          host: "localhost", port: 8000, ssl: false,
          tenant: "default_tenant", database: "default_database",
          auth_mode: "none", has_token: false,
        }),
        { status: 200 },
      ),
    ),
  );
  const info = await api.getConnection();
  expect(info.host).toBe("localhost");
  expect(fetch).toHaveBeenCalledWith("/api/connection", expect.any(Object));
});

test("saveConnection PUTs the body", async () => {
  const f = vi.fn(async () =>
    new Response(JSON.stringify({ has_token: true }), { status: 200 }),
  );
  vi.stubGlobal("fetch", f);
  await api.saveConnection({
    host: "h", port: 1, ssl: false,
    tenant: "t", database: "d", auth_mode: "none",
  });
  const [, init] = f.mock.calls[0];
  expect(init.method).toBe("PUT");
});
