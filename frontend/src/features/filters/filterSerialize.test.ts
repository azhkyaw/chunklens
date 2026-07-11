import { expect, test } from "vitest";
import { newGroup, newMetaCondition, newDocCondition, addChild, type GroupNode } from "./filterModel";
import { serialize, validate } from "./filterSerialize";

function meta(field: string, operator: any, value: any, valueType: any = "string") {
  return { ...newMetaCondition(), field, operator, value, valueType };
}

test("empty group serializes to undefined", () => {
  expect(serialize(newGroup())).toBeUndefined();
});

test("single child collapses (no $and wrapper)", () => {
  let root = newGroup();
  root = addChild(root, root.id, meta("lang", "$eq", "en"));
  expect(serialize(root)).toEqual({ lang: { $eq: "en" } });
});

test("multiple children wrap in connective; nested groups and leaf shapes", () => {
  let root = newGroup("$and");
  root = addChild(root, root.id, meta("lang", "$eq", "en"));
  root = addChild(root, root.id, meta("year", "$gt", 2020, "number"));
  const orGroup = newGroup("$or");
  root = addChild(root, root.id, orGroup);
  root = addChild(root, orGroup.id, meta("tag", "$in", ["a", "b"]));
  expect(serialize(root)).toEqual({
    $and: [{ lang: { $eq: "en" } }, { year: { $gt: 2020 } }, { tag: { $in: ["a", "b"] } }],
  });
});

test("document leaf serializes operator->text", () => {
  let root = newGroup();
  root = addChild(root, root.id, { ...newDocCondition(), operator: "$contains", text: "fox" });
  expect(serialize(root)).toEqual({ $contains: "fox" });
});

test("validate flags incomplete leaves", () => {
  let root = newGroup();
  const c = newMetaCondition();
  root = addChild(root, root.id, c);
  expect(validate(root).map((e) => e.message)).toContain("field required");
});

test("validate flags empty $in, non-numeric comparison, empty doc text, bad regex", () => {
  expect(validate(meta("t", "$in", [])).map((e) => e.message)).toContain("add at least one value");
  expect(validate(meta("y", "$gt", NaN, "number")).map((e) => e.message)).toContain("expects a number");
  expect(validate({ ...newDocCondition(), text: "" }).map((e) => e.message)).toContain("text required");
  expect(validate({ ...newDocCondition(), operator: "$regex", text: "(" }).map((e) => e.message)).toContain("invalid regular expression");
});

test("comparison operators demand the num value type", () => {
  expect(validate(meta("page", "$gt", "5", "string")).map((e) => e.message)).toContain("comparisons need the num value type");
});

test("numeric in-lists reject values that did not parse", () => {
  expect(validate(meta("page", "$in", [1, NaN], "number")).map((e) => e.message)).toContain("every value must be a number");
});

test("a fully-specified tree validates clean", () => {
  let root = newGroup();
  root = addChild(root, root.id, meta("lang", "$eq", "en"));
  expect(validate(root)).toEqual([]);
});

test("non-comparison operators on strings are untouched by the numeric requirement", () => {
  expect(validate(meta("lang", "$eq", "en"))).toEqual([]);
  expect(validate(meta("tag", "$in", ["a", "b"]))).toEqual([]);
  expect(validate({ ...newMetaCondition(), field: "ok", operator: "$eq", value: true, valueType: "boolean" })).toEqual([]);
});
