import { expect, test, vi } from "vitest";
import { getLastLatency, setLastLatency, subscribeLatency, timed } from "./latency";

test("timed returns the result and an integer wall-clock duration", async () => {
  const { result, ms } = await timed(async () => "ok");
  expect(result).toBe("ok");
  expect(ms).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(ms)).toBe(true);
});

test("timed propagates rejections", async () => {
  await expect(timed(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
});

test("the last-latency store notifies subscribers and unsubscribes cleanly", () => {
  const fn = vi.fn();
  const off = subscribeLatency(fn);
  setLastLatency(38);
  expect(getLastLatency()).toBe(38);
  expect(fn).toHaveBeenCalledTimes(1);
  off();
  setLastLatency(40);
  expect(fn).toHaveBeenCalledTimes(1);
  setLastLatency(null);
  expect(getLastLatency()).toBeNull();
});
