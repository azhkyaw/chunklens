import { expect, test } from "vitest";
import { newQuerySpec, serializeSpec, specErrors } from "./querySpec";
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
