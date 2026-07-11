import { expect, test } from "vitest";
import { nextIndex } from "./selectionMove";

test("an empty list has no valid index regardless of direction", () => {
  expect(nextIndex(0, -1, 1)).toBe(-1);
  expect(nextIndex(0, -1, -1)).toBe(-1);
});

test("no selection jumps to the first item on +1 and the last item on -1", () => {
  expect(nextIndex(3, -1, 1)).toBe(0);
  expect(nextIndex(3, -1, -1)).toBe(2);
});

test("clamps at both ends instead of wrapping", () => {
  expect(nextIndex(3, 2, 1)).toBe(2);
  expect(nextIndex(3, 0, -1)).toBe(0);
});

test("steps by delta within bounds", () => {
  expect(nextIndex(3, 1, 1)).toBe(2);
  expect(nextIndex(3, 1, -1)).toBe(0);
});
