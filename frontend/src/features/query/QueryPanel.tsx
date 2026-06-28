import { useState } from "react";
import { useMetadataKeys, useRunQuery } from "../../api/hooks";
import { FilterBuilder } from "../filters/FilterBuilder";
import { newGroup, type GroupNode } from "../filters/filterModel";
import { serialize, validate } from "../filters/filterSerialize";

export function QueryPanel({ name }: { name: string }) {
  const [text, setText] = useState("");
  const [nResults, setNResults] = useState(10);
  const [whereTree, setWhereTree] = useState<GroupNode>(() => newGroup());
  const [docTree, setDocTree] = useState<GroupNode>(() => newGroup());
  const run = useRunQuery(name);
  const { data: keysData } = useMetadataKeys(name);
  const keys = keysData?.keys ?? [];

  const errors = [...validate(whereTree), ...validate(docTree)];
  const invalid = errors.length > 0;

  function onRun() {
    run.mutate({
      query_text: text,
      n_results: nResults,
      where: serialize(whereTree) as Record<string, unknown> | undefined,
      where_document: serialize(docTree) as Record<string, unknown> | undefined,
    });
  }

  return (
    <section style={{ marginTop: 16 }}>
      <h3>Query</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label>Query text <input value={text} onChange={(e) => setText(e.target.value)} /></label>
        <label>n_results <input type="number" min={1} value={nResults} onChange={(e) => setNResults(Math.max(1, Number(e.target.value) || 1))} style={{ width: 60 }} /></label>
        <button onClick={onRun} disabled={!text || invalid || run.isPending}>Run</button>
      </div>
      {keysData && <p style={{ fontSize: 12, color: "#666" }}>keys from {keysData.sampled} of {keysData.total} records</p>}

      <FilterBuilder title="Metadata filter (where)" lang="where" tree={whereTree} keys={keys} onChange={setWhereTree} />
      <FilterBuilder title="Document filter (where_document)" lang="where_document" tree={docTree} keys={keys} onChange={setDocTree} />

      {invalid && <p role="alert">Fix filter errors: {errors.map((e) => e.message).join("; ")}</p>}
      {run.error && <p role="alert">Query failed - {(run.error as Error).message}</p>}
      <ol>
        {run.data?.hits.map((h) => (
          <li key={h.id}>{h.id} - {h.distance.toFixed(4)}{h.document ? `: ${h.document}` : ""}</li>
        ))}
      </ol>
    </section>
  );
}
