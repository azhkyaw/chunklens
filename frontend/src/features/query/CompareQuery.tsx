import { useState } from "react";
import { useRunQuery, useCollectionDetails } from "../../api/hooks";
import { QueryForm } from "./QueryForm";
import { CompareView } from "../retrieval/CompareView";
import { newQuerySpec, serializeSpec, specErrors, type QuerySpec } from "./querySpec";

export function CompareQuery({ name }: { name: string }) {
  const [specA, setSpecA] = useState<QuerySpec>(() => newQuerySpec());
  const [specB, setSpecB] = useState<QuerySpec>(() => newQuerySpec());
  const runA = useRunQuery(name);
  const runB = useRunQuery(name);
  const { data: details } = useCollectionDetails(name);
  const metric = details?.distance_metric ?? "l2";
  const invalid = specErrors(specA).length > 0 || specErrors(specB).length > 0;
  const pending = runA.isPending || runB.isPending;

  function runBoth() {
    runA.mutate(serializeSpec(specA));
    runB.mutate(serializeSpec(specB));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 16 }}>
        <QueryForm name={name} spec={specA} onChange={setSpecA} />
        <QueryForm name={name} spec={specB} onChange={setSpecB} />
      </div>
      <button onClick={runBoth} disabled={!specA.text || !specB.text || invalid || pending}>Run both</button>
      {runA.data && runB.data && <CompareView a={runA.data} b={runB.data} metric={metric} />}
    </div>
  );
}
