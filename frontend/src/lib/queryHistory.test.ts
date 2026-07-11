import { beforeEach, expect, test, vi } from "vitest";
import {
  clearHistory, consumeReplay, getHistory, historyLabel,
  recordQuery, requestReplay, subscribeReplay,
} from "./queryHistory";
import { newQuerySpec, type QuerySpec } from "../features/query/querySpec";

beforeEach(() => clearHistory());

function spec(text: string, n = 10): QuerySpec {
  return { ...newQuerySpec(), text, nResults: n };
}

test("records queries most-recent-first, per collection", () => {
  recordQuery("a", spec("first"));
  recordQuery("a", spec("second"));
  recordQuery("b", spec("other"));
  expect(getHistory("a").map((e) => e.label)).toEqual(["second · n=10", "first · n=10"]);
  expect(getHistory("b")).toHaveLength(1);
  expect(getHistory("missing")).toEqual([]);
});

test("re-running an identical query moves it to the front instead of duplicating", () => {
  recordQuery("a", spec("one"));
  recordQuery("a", spec("two"));
  recordQuery("a", spec("one"));
  expect(getHistory("a").map((e) => e.label)).toEqual(["one · n=10", "two · n=10"]);
});

test("same text with different settings stays as separate entries", () => {
  recordQuery("a", spec("one", 5));
  recordQuery("a", spec("one", 10));
  expect(getHistory("a")).toHaveLength(2);
});

test("the ring caps at 20 entries", () => {
  for (let i = 0; i < 25; i++) recordQuery("a", spec(`q${i}`));
  const labels = getHistory("a").map((e) => e.label);
  expect(labels).toHaveLength(20);
  expect(labels[0]).toBe("q24 · n=10");
  expect(labels).not.toContain("q4 · n=10");
});

test("stored specs are snapshots, not live references", () => {
  const s = spec("hello");
  recordQuery("a", s);
  s.text = "mutated";
  expect(getHistory("a")[0].spec.text).toBe("hello");
});

test("labels truncate long text and name vector queries", () => {
  const long = "x".repeat(60);
  expect(historyLabel(spec(long))).toBe(`${"x".repeat(47)}… · n=10`);
  expect(historyLabel({ ...newQuerySpec(), mode: "vector", vector: "[1,2]" })).toBe("vector query · n=10");
});

test("replay hands the spec to its collection exactly once", () => {
  requestReplay("a", spec("replay me"));
  expect(consumeReplay("b")).toBeNull();      // wrong collection leaves it pending
  const got = consumeReplay("a");
  expect(got?.text).toBe("replay me");
  expect(consumeReplay("a")).toBeNull();      // consumed
});

test("replay notifies subscribers and unsubscribes cleanly", () => {
  const fn = vi.fn();
  const off = subscribeReplay(fn);
  requestReplay("a", spec("x"));
  expect(fn).toHaveBeenCalledTimes(1);
  off();
  requestReplay("a", spec("y"));
  expect(fn).toHaveBeenCalledTimes(1);
});

test("clearHistory drops rings and any pending replay", () => {
  recordQuery("a", spec("x"));
  requestReplay("a", spec("x"));
  clearHistory();
  expect(getHistory("a")).toEqual([]);
  expect(consumeReplay("a")).toBeNull();
});
