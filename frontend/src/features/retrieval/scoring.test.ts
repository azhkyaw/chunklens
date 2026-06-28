import { expect, test } from "vitest";
import { interpretScore, barFractions } from "./scoring";

test("cosine distance becomes similarity", () => {
  const s = interpretScore(0.09, "cosine");
  expect(s).toEqual({ primary: "0.91", label: "similarity", betterIsHigher: true, raw: 0.09 });
});

test("l2 distance is shown raw, lower-is-better", () => {
  const s = interpretScore(0.7, "l2");
  expect(s).toMatchObject({ primary: "0.7", label: "distance", betterIsHigher: false });
});

test("barFractions normalize within the set (cosine)", () => {
  const f = barFractions([0.09, 0.12, 0.26], "cosine");
  expect(f[0]).toBeCloseTo(1);
  expect(f[2]).toBeCloseTo(0);
  expect(f[1]).toBeGreaterThan(0);
  expect(f[1]).toBeLessThan(1);
});

test("barFractions all-equal -> all full", () => {
  expect(barFractions([0.5, 0.5], "l2")).toEqual([1, 1]);
});
