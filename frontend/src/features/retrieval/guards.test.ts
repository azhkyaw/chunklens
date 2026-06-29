import { expect, test } from "vitest";
import { defaultQueryMode, evaluateGuards, showsEmbedderPicker } from "./guards";
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

test("defaultQueryMode: a surfaced provider EF opens in text (we embed for it)", () => {
  expect(defaultQueryMode(det({ embedding_function: "openai", dimensionality: 1536 }), ["openai", "cohere"])).toBe("text");
});
test("defaultQueryMode: an unsurfaced non-default EF stays vector", () => {
  expect(defaultQueryMode(det({ embedding_function: "mystery", dimensionality: 1536 }), ["openai"])).toBe("vector");
});
test("defaultQueryMode: none stays vector even when providerIds are given", () => {
  expect(defaultQueryMode(det({ embedding_function: "none", dimensionality: 1536 }), ["openai"])).toBe("vector");
});
test("no dim-mismatch warn when an embedder is selected", () => {
  const g = evaluateGuards({ details: det({ embedding_function: "openai", dimensionality: 1536 }), mode: "text", text: "hi", hasEmbedding: false, embedderSelected: true });
  expect(g.some((x) => x.level === "warn")).toBe(false);
});

test("showsEmbedderPicker: hidden only for a plain default collection", () => {
  expect(showsEmbedderPicker(undefined)).toBe(false);
  expect(showsEmbedderPicker(det({ embedding_function: "default", dimensionality: 384 }))).toBe(false);
  expect(showsEmbedderPicker(det({ embedding_function: "default", dimensionality: null }))).toBe(false);
  expect(showsEmbedderPicker(det({ embedding_function: "default", dimensionality: 1536 }))).toBe(true);
  expect(showsEmbedderPicker(det({ embedding_function: "none", dimensionality: 5 }))).toBe(true);
  expect(showsEmbedderPicker(det({ embedding_function: "openai", dimensionality: 1536 }))).toBe(true);
});

test("defaultQueryMode: a saved hint opens in text even for none / non-384", () => {
  expect(defaultQueryMode(det({ embedding_function: "none", dimensionality: 5 }), [], true)).toBe("text");
  expect(defaultQueryMode(det({ embedding_function: "default", dimensionality: 1536 }), [], true)).toBe("text");
});

test("evaluateGuards: a selected embedder unblocks text on a none-EF collection", () => {
  const g = evaluateGuards({ details: det({ embedding_function: "none" }), mode: "text", text: "hi", hasEmbedding: false, embedderSelected: true });
  expect(g.some((x) => x.level === "block")).toBe(false);
});
