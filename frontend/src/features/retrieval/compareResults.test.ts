import { expect, test } from "vitest";
import { compareResults } from "./compareResults";
import type { QueryHit } from "../../api/types";

const h = (id: string, d = 0): QueryHit => ({ id, document: null, metadata: null, distance: d });

test("shared hits carry a rank delta (positive = moved up in B)", () => {
  const rows = compareResults([h("x"), h("y")], [h("y"), h("x")]);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  expect(byId.y).toMatchObject({ membership: "shared", delta: 1 });   // A#2 -> B#1
  expect(byId.x).toMatchObject({ membership: "shared", delta: -1 });  // A#1 -> B#2
});

test("unique hits are tagged onlyA / onlyB", () => {
  const rows = compareResults([h("x")], [h("z")]);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  expect(byId.x.membership).toBe("onlyA");
  expect(byId.z.membership).toBe("onlyB");
});

test("rows are ordered by best rank, ties keep union order", () => {
  // A=[x,y], B=[y]: both x and y have best rank 1 -> tie kept in union (A-first) order
  const rows = compareResults([h("x"), h("y")], [h("y")]);
  expect(rows.map((r) => r.id)).toEqual(["x", "y"]);
});
