import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./client";
import { useRunQuery } from "./hooks";
import { getLastLatency } from "../lib/latency";

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

test("useRunQuery times the fetch and publishes the last latency", async () => {
  vi.spyOn(api, "query").mockResolvedValue({ hits: [] });
  const { result } = renderHook(() => useRunQuery("demo"), { wrapper });
  result.current.mutate({ query_text: "x" });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data!.hits).toEqual([]);
  expect(Number.isInteger(result.current.data!.ms)).toBe(true);
  expect(getLastLatency()).toBe(result.current.data!.ms);
});

test("a failed query does not touch the published latency", async () => {
  const before = getLastLatency();
  vi.spyOn(api, "query").mockRejectedValue(new Error("boom"));
  const { result } = renderHook(() => useRunQuery("demo"), { wrapper });
  result.current.mutate({ query_text: "x" });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(getLastLatency()).toBe(before);
});
