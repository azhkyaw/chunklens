import { useState } from "react";
import { useRunQuery, useCollectionDetails, useMetadataKeys } from "../../api/hooks";
import { QueryForm } from "./QueryForm";
import { ResultsPanel } from "../retrieval/ResultsPanel";
import { newQuerySpec, serializeSpec, specErrors, type QuerySpec } from "./querySpec";

export function SingleQuery({ name }: { name: string }) {
  const [spec, setSpec] = useState<QuerySpec>(() => newQuerySpec());
  const run = useRunQuery(name);
  const { data: details } = useCollectionDetails(name);
  const { data: keysData } = useMetadataKeys(name);
  const metric = details?.distance_metric ?? "l2";
  const keyNames = (keysData?.keys ?? []).map((k) => k.key);
  const errors = specErrors(spec);
  const invalid = errors.length > 0;

  return (
    <div>
      <QueryForm name={name} spec={spec} onChange={setSpec} />
      <button onClick={() => run.mutate(serializeSpec(spec))} disabled={!spec.text || invalid || run.isPending}>Run</button>
      {invalid && <p role="alert">Fix filter errors: {errors.map((e) => e.message).join("; ")}</p>}
      {run.error && <p role="alert">Query failed - {(run.error as Error).message}</p>}
      {run.data && <ResultsPanel hits={run.data.hits} metric={metric} keys={keyNames} />}
    </div>
  );
}
