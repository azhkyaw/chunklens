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

test("a request-validation failure names the field instead of dumping JSON", () => {
  // api/client.ts throws `${status}: ${body}`, so a rejected request arrives as
  // a raw FastAPI validation body. Showing that to a user is not an option.
  const raw =
    '422: {"detail":[{"type":"less_than_equal","loc":["body","n_results"],' +
    '"msg":"Input should be less than or equal to 1000","input":2000}]}';
  const out = interpretQueryError(raw, {});
  expect(out).toMatch(/n_results/);
  expect(out).toMatch(/less than or equal to 1000/);
  expect(out).not.toMatch(/[{}[\]]/);
  expect(out).not.toMatch(/detail/);
});

test("a validation failure with an unreadable body still avoids raw output", () => {
  const out = interpretQueryError("422: Unprocessable Entity", {});
  expect(out).toMatch(/invalid/i);
  expect(out).not.toMatch(/^422/);
});
