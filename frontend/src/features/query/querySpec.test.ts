import { expect, test } from "vitest";
import { newQuerySpec, parseVector, serializeSpec, specErrors, vectorError } from "./querySpec";
import type { CollectionDetails } from "../../api/types";
import { addChild, newMetaCondition } from "../filters/filterModel";

test("newQuerySpec has sane defaults", () => {
  const s = newQuerySpec();
  expect(s).toMatchObject({ text: "", nResults: 10 });
  expect(s.whereTree.children).toEqual([]);
});

test("serializeSpec builds a QueryRequest, reusing filterSerialize", () => {
  const s = newQuerySpec();
  s.text = "hello";
  s.whereTree = addChild(s.whereTree, s.whereTree.id, { ...newMetaCondition(), field: "lang", operator: "$eq", value: "en" });
  const body = serializeSpec(s);
  expect(body.query_text).toBe("hello");
  expect(body.n_results).toBe(10);
  expect(body.where).toEqual({ lang: { $eq: "en" } });
});

test("specErrors surfaces incomplete leaves from both trees", () => {
  const s = newQuerySpec();
  s.whereTree = addChild(s.whereTree, s.whereTree.id, newMetaCondition());
  expect(specErrors(s).map((e) => e.message)).toContain("field required");
});

const det = (dim: number | null): CollectionDetails => ({
  name: "c", count: 0, dimensionality: dim,
  distance_metric: "l2", embedding_function: "none", metadata: {},
});

test("parseVector accepts a JSON array", () => {
  expect(parseVector("[1, 2.5, -3]").vector).toEqual([1, 2.5, -3]);
});
test("parseVector accepts bare comma/space separated", () => {
  expect(parseVector("1, 2.5 -3").vector).toEqual([1, 2.5, -3]);
});
test("parseVector rejects empty and non-numeric", () => {
  expect(parseVector("   ").error).toBeTruthy();
  expect(parseVector("a, b").error).toBeTruthy();
});
test("vectorError is null in text mode", () => {
  expect(vectorError(newQuerySpec(), det(3))).toBeNull();
});
test("vectorError checks length against dimensionality", () => {
  const spec = { ...newQuerySpec(), mode: "vector" as const, vector: "[1, 2]" };
  expect(vectorError(spec, det(2))).toBeNull();
  expect(vectorError(spec, det(3))).toMatch(/expected 3/i);
  expect(vectorError(spec, det(null))).toBeNull(); // unknown dim -> skip length check
});
test("serializeSpec emits query_embedding in vector mode, query_text otherwise", () => {
  const v = { ...newQuerySpec(), mode: "vector" as const, vector: "[1, 2, 3]" };
  expect(serializeSpec(v).query_embedding).toEqual([1, 2, 3]);
  expect(serializeSpec(v).query_text).toBeUndefined();
  const t = { ...newQuerySpec(), text: "hello" };
  expect(serializeSpec(t).query_text).toBe("hello");
  expect(serializeSpec(t).query_embedding).toBeUndefined();
});
