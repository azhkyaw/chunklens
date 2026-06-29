import { useState } from "react";
import { useRunQuery, useCollectionDetails, useMetadataKeys } from "../../api/hooks";
import { QueryForm } from "./QueryForm";
import { ResultsPanel } from "../retrieval/ResultsPanel";
import { QueryContextStrip } from "../retrieval/QueryContextStrip";
import { GuardBanner } from "../retrieval/GuardBanner";
import { evaluateGuards } from "../retrieval/guards";
import { interpretQueryError } from "../retrieval/errorInterpret";
import { newQuerySpec, serializeSpec, specErrors, type QuerySpec } from "./querySpec";

export function SingleQuery({ name }: { name: string }) {
  const [spec, setSpec] = useState<QuerySpec>(() => newQuerySpec());
  const run = useRunQuery(name);
  const { data: details } = useCollectionDetails(name);
  const { data: keysData } = useMetadataKeys(name);
  const metric = details?.distance_metric ?? "l2";
  const keyNames = (keysData?.keys ?? []).map((k) => k.key);
  const errors = specErrors(spec);
  const guards = evaluateGuards({ details, text: spec.text, hasEmbedding: false });
  const blocked = guards.some((g) => g.level === "block");

  return (
    <div className="console-body">
      <QueryContextStrip details={details} />
      <QueryForm name={name} spec={spec} onChange={setSpec} />
      <GuardBanner guards={guards} />
      <div className="form-actions">
        <button className="btn-primary" onClick={() => run.mutate(serializeSpec(spec))}
                disabled={!spec.text || errors.length > 0 || blocked || run.isPending}>Run</button>
      </div>
      {errors.length > 0 && <p role="alert">Fix filter errors: {errors.map((e) => e.message).join("; ")}</p>}
      {run.error && <p role="alert">Query failed - {interpretQueryError((run.error as Error).message, { details })}</p>}
      {run.data && <ResultsPanel hits={run.data.hits} metric={metric} keys={keyNames} />}
    </div>
  );
}
