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
