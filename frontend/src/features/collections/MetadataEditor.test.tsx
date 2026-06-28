import { expect, test } from "vitest";
import { parseScalarMetadata } from "./MetadataEditor";

test("parses a flat scalar object", () => {
  expect(parseScalarMetadata('{"a":1,"b":"x","c":true}')).toEqual({ a: 1, b: "x", c: true });
});

test("empty text is an empty object", () => {
  expect(parseScalarMetadata("   ")).toEqual({});
});

test("rejects non-object JSON", () => {
  expect(() => parseScalarMetadata("[1,2]")).toThrow();
});

test("rejects nested values", () => {
  expect(() => parseScalarMetadata('{"a":{"n":1}}')).toThrow(/string, number, or boolean/i);
});
