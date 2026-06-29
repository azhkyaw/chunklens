import { expect, test } from "vitest";
import { defaultQueryMode, evaluateGuards } from "./guards";
import type { CollectionDetails } from "../../api/types";

const det = (over: Partial<CollectionDetails>): CollectionDetails => ({
  name: "c", count: 0, dimensionality: null,
  distance_metric: "l2", embedding_function: "default", metadata: {}, ...over,
});

test("blocks text query on a none-EF collection", () => {
  const g = evaluateGuards({ details: det({ embedding_function: "none" }), mode: "text", text: "hello", hasEmbedding: false });
  expect(g.some((x) => x.level === "block")).toBe(true);
});
test("does not block in vector mode even with leftover text", () => {
  const g = evaluateGuards({ details: det({ embedding_function: "none" }), mode: "vector", text: "hello", hasEmbedding: false });
  expect(g.some((x) => x.level === "block")).toBe(false);
});
test("no guard when default EF and unknown dim", () => {
  expect(evaluateGuards({ details: det({ embedding_function: "default" }), mode: "text", text: "hello", hasEmbedding: false })).toEqual([]);
});
test("no guard when text is empty", () => {
  expect(evaluateGuards({ details: det({ embedding_function: "none" }), mode: "text", text: "  ", hasEmbedding: false })).toEqual([]);
});
test("defaultQueryMode picks vector when the default embedder can't match", () => {
  expect(defaultQueryMode(undefined)).toBe("text");
  expect(defaultQueryMode(det({ embedding_function: "none", dimensionality: 5 }))).toBe("vector");
  expect(defaultQueryMode(det({ dimensionality: 1536 }))).toBe("vector");
  expect(defaultQueryMode(det({ dimensionality: 384 }))).toBe("text");
  expect(defaultQueryMode(det({ dimensionality: null }))).toBe("text");
});
test("non-none collection with dim != 384 warns in text mode", () => {
  const g = evaluateGuards({ details: det({ dimensionality: 1536 }), mode: "text", text: "hi", hasEmbedding: false });
  expect(g.some((x) => x.level === "warn")).toBe(true);
});
test("dim == 384 does not warn", () => {
  const g = evaluateGuards({ details: det({ dimensionality: 384 }), mode: "text", text: "hi", hasEmbedding: false });
  expect(g).toHaveLength(0);
});
test("vector mode never blocks or warns", () => {
  const g = evaluateGuards({ details: det({ dimensionality: 1536 }), mode: "vector", text: "", hasEmbedding: true });
  expect(g).toHaveLength(0);
});
