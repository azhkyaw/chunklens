import { expect, test } from "vitest";
import { COLLECTION_TABS, collectionPath, isCollectionTab } from "./routes";

test("collectionPath defaults to the records tab", () => {
  expect(collectionPath("demo")).toBe("/c/demo/records");
});

test("collectionPath targets a specific tab", () => {
  expect(collectionPath("demo", "compare")).toBe("/c/demo/compare");
});

test("collectionPath URL-encodes the collection name", () => {
  expect(collectionPath("my col")).toBe("/c/my%20col/records");
});

test("isCollectionTab accepts exactly the known tabs", () => {
  for (const t of COLLECTION_TABS) expect(isCollectionTab(t)).toBe(true);
  expect(isCollectionTab("bogus")).toBe(false);
  expect(isCollectionTab("")).toBe(false);
});
