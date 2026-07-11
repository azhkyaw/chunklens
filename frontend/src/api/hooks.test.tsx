import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./client";
import { useConnectionStatus, useRunQuery } from "./hooks";
import { getLastLatency, setLastLatency } from "../lib/latency";

afterEach(() => {
  vi.restoreAllMocks();
  // Belt and braces: no test may leak fake timers into the next one.
  vi.useRealTimers();
  setLastLatency(null);
});

function wrapper({ children }: { children: React.ReactNode }) {
  // retry: false - a rejected fetch must land in the error state at once
  // instead of burning three backoff-delayed attempts.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

// useConnectionStatus's refetchInterval is a predicate, and the difference
// between it and a plain `refetchInterval: 5000` is invisible to every other
// test in the suite - so pin BOTH directions. This app is local-first with no
// background network: a healthy connection must never be re-probed (three
// mounted consumers share this query), while a down one must keep probing or
// the banner can never clear itself.

test("useConnectionStatus does not poll while the connection is healthy", async () => {
  vi.useFakeTimers();
  try {
    const spy = vi
      .spyOn(api, "testConnection")
      .mockResolvedValue({ ok: true, error: null, heartbeat_ns: 1 });
    const { result } = renderHook(() => useConnectionStatus(), { wrapper });
    // Ten seconds of wall clock - two turns of the 5s interval, if one existed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(result.current.data).toEqual({ ok: true, error: null, heartbeat_ns: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

test("useConnectionStatus polls while the connection is down", async () => {
  vi.useFakeTimers();
  try {
    const spy = vi
      .spyOn(api, "testConnection")
      .mockResolvedValue({ ok: false, error: "refused", heartbeat_ns: null });
    renderHook(() => useConnectionStatus(), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_100);
    });
    expect(spy.mock.calls.length).toBeGreaterThan(1);
  } finally {
    vi.useRealTimers();
  }
});

test("useConnectionStatus polls while the status check itself is failing", async () => {
  vi.useFakeTimers();
  try {
    // The chunklens backend is gone, so the fetch rejects. v5 keeps the last
    // successful `data`, so the predicate has to look at the error state too -
    // otherwise the UI would never re-probe and could never self-heal.
    const spy = vi.spyOn(api, "testConnection").mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useConnectionStatus(), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    // Advance past the retry delay so the second attempt completes and error
    // state is reached.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.isError).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_100);
    });
    expect(spy.mock.calls.length).toBeGreaterThan(2);
  } finally {
    vi.useRealTimers();
  }
});

test("the status check settles into error after exactly one quick retry", async () => {
  vi.spyOn(api, "testConnection").mockRejectedValue(new Error("down"));
  // Deliberately a DEFAULT client (no retry: false): the hook's own retry cap
  // must govern, because production has no test-side override.
  const qc = new QueryClient();
  const wrapper_prod = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useConnectionStatus(), { wrapper: wrapper_prod });
  await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
  expect(api.testConnection).toHaveBeenCalledTimes(2);
});
