import { expect, test } from "vitest";
import { interpretQueryError } from "./errorInterpret";

const ctx = { details: { name: "c", count: 0, dimensionality: 384, distance_metric: "l2", embedding_function: "default", metadata: {} } };

test("dimension mismatch becomes a plain-language hint with the expected dim", () => {
  const out = interpretQueryError("Collection expects embedding with dimension 384, got 2", ctx);
  expect(out).toMatch(/dimensionality/i);
  expect(out).toMatch(/384/);
});

test("missing embedding function is explained", () => {
  expect(interpretQueryError("no embedding function configured", {})).toMatch(/raw vector/i);
});

test("unknown errors pass through verbatim", () => {
  expect(interpretQueryError("some other failure", {})).toBe("some other failure");
});
