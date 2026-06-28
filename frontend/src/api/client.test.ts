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
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ has_token: true }), { status: 200 }),
    ),
  );
  await api.saveConnection({
    host: "h", port: 1, ssl: false,
    tenant: "t", database: "d", auth_mode: "none",
  });
  expect(fetch).toHaveBeenCalledWith(
    "/api/connection",
    expect.objectContaining({ method: "PUT" }),
  );
});

test("createCollection POSTs and deleteCollection handles 204", async () => {
  const f = vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === "DELETE"
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify({ name: "c", count: 0 }), { status: 201 }),
  );
  vi.stubGlobal("fetch", f);

  await api.createCollection({
    name: "c", distance_metric: "l2", embedding_function: "default",
  });
  expect(fetch).toHaveBeenCalledWith(
    "/api/collections",
    expect.objectContaining({ method: "POST" }),
  );

  await expect(api.deleteCollection("c")).resolves.toBeUndefined();
});

test("getMetadataKeys GETs the endpoint", async () => {
  const f = vi.fn(async () =>
    new Response(JSON.stringify({ keys: [{ key: "lang", types: ["string"] }], sampled: 3, total: 3 }), { status: 200 }),
  );
  vi.stubGlobal("fetch", f);
  const resp = await api.getMetadataKeys("docs");
  expect(resp.keys[0].key).toBe("lang");
  expect(fetch).toHaveBeenCalledWith("/api/collections/docs/metadata-keys", expect.any(Object));
});
