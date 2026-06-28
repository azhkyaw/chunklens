import { expect, test } from "vitest";
import { evaluateGuards } from "./guards";
import type { CollectionDetails } from "../../api/types";

const details = (ef: string): CollectionDetails =>
  ({ name: "c", count: 0, dimensionality: null, distance_metric: "l2", embedding_function: ef, metadata: {} });

test("blocks text query on a none-EF collection", () => {
  const g = evaluateGuards({ details: details("none"), text: "hello", hasEmbedding: false });
  expect(g).toHaveLength(1);
  expect(g[0].level).toBe("block");
});

test("no guard when EF present", () => {
  expect(evaluateGuards({ details: details("default"), text: "hello", hasEmbedding: false })).toEqual([]);
});

test("no guard when text is empty", () => {
  expect(evaluateGuards({ details: details("none"), text: "  ", hasEmbedding: false })).toEqual([]);
});
