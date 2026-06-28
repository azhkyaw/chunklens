import { expect, test } from "vitest";
import { isProvenanceKey, groupBySource } from "./provenance";
import type { QueryHit } from "../../api/types";

const hit = (id: string, meta: Record<string, unknown> | null): QueryHit =>
  ({ id, document: null, metadata: meta, distance: 0 });

test("provenance keys are recognized case-insensitively", () => {
  expect(isProvenanceKey("Source")).toBe(true);
  expect(isProvenanceKey("page")).toBe(true);
  expect(isProvenanceKey("color")).toBe(false);
});

test("groupBySource buckets by value in first-seen (rank) order", () => {
  const groups = groupBySource(
    [hit("a", { source: "x" }), hit("b", { source: "y" }), hit("c", { source: "x" })],
    "source",
  );
  expect(groups.map((g) => g.value)).toEqual(["x", "y"]);
  expect(groups[0].hits.map((h) => h.id)).toEqual(["a", "c"]);
});

test("missing key falls into a (none) bucket", () => {
  const groups = groupBySource([hit("a", { other: 1 })], "source");
  expect(groups[0].value).toBe("(none)");
});
