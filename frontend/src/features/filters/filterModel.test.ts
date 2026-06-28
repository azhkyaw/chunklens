import { expect, test } from "vitest";
import {
  newGroup, newMetaCondition, newDocCondition,
  updateNode, removeNode, addChild, type GroupNode,
} from "./filterModel";

test("constructors produce expected shapes", () => {
  const g = newGroup();
  expect(g.kind).toBe("group");
  expect(g.connective).toBe("$and");
  expect(g.children).toEqual([]);
  const m = newMetaCondition();
  expect(m).toMatchObject({ kind: "condition", lang: "where", field: "", operator: "$eq", value: "", valueType: "string" });
  const d = newDocCondition();
  expect(d).toMatchObject({ kind: "condition", lang: "where_document", operator: "$contains", text: "" });
});

test("addChild appends to the matching group (nested)", () => {
  let root = newGroup();
  const inner = newGroup("$or");
  root = addChild(root, root.id, inner);
  const cond = newMetaCondition();
  root = addChild(root, inner.id, cond);
  const innerNow = root.children[0] as GroupNode;
  expect(innerNow.children[0].id).toBe(cond.id);
});

test("updateNode patches the matching node by id (nested)", () => {
  let root = newGroup();
  const cond = newMetaCondition();
  root = addChild(root, root.id, cond);
  root = updateNode(root, cond.id, { field: "lang" }) as GroupNode;
  expect((root.children[0] as any).field).toBe("lang");
});

test("removeNode removes the matching node by id (nested)", () => {
  let root = newGroup();
  const inner = newGroup();
  const cond = newMetaCondition();
  root = addChild(root, root.id, inner);
  root = addChild(root, inner.id, cond);
  root = removeNode(root, cond.id);
  expect((root.children[0] as GroupNode).children).toEqual([]);
});
