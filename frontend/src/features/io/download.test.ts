import { expect, test } from "vitest";
import { serializeExport } from "./download";
import type { ExportFile } from "../../api/types";

test("serializeExport pretty-prints and round-trips", () => {
  const data: ExportFile = {
    chunklens_export: 1,
    collection: { name: "c", distance_metric: "l2", embedding_function: "none", metadata: {} },
    records: [{ id: "a", document: "x", embedding: [1, 2] }],
  };
  const text = serializeExport(data);
  expect(text).toContain("\n");           // pretty-printed
  expect(JSON.parse(text)).toEqual(data); // lossless
});
