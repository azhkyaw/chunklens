import { useEffect, useRef, useState } from "react";
import { useRunQuery, useCollectionDetails, useMetadataKeys } from "../../api/hooks";
import { QueryForm } from "./QueryForm";
import { ResultsPanel } from "../retrieval/ResultsPanel";
import { QueryContextStrip } from "../retrieval/QueryContextStrip";
import { GuardBanner } from "../retrieval/GuardBanner";
import { evaluateGuards, defaultQueryMode } from "../retrieval/guards";
import { interpretQueryError } from "../retrieval/errorInterpret";
import { newQuerySpec, serializeSpec, specErrors, vectorError, type QuerySpec } from "./querySpec";

export function SingleQuery({ name }: { name: string }) {
  const [spec, setSpec] = useState<QuerySpec>(() => newQuerySpec());
  const run = useRunQuery(name);
  const { data: details } = useCollectionDetails(name);
  const { data: keysData } = useMetadataKeys(name);
  const metric = details?.distance_metric ?? "l2";
  const keyNames = (keysData?.keys ?? []).map((k) => k.key);

  const appliedFor = useRef<string | null>(null);
  useEffect(() => {
    if (details && appliedFor.current !== name) {
      appliedFor.current = name;
      setSpec((s) => ({ ...s, mode: defaultQueryMode(details) }));
    }
  }, [details, name]);

  const errors = specErrors(spec);
  const verr = vectorError(spec, details);
  const guards = evaluateGuards({ details, mode: spec.mode, text: spec.text, hasEmbedding: spec.mode === "vector" && verr === null });
  const blocked = guards.some((g) => g.level === "block");
  const ready = spec.mode === "text" ? spec.text.trim() !== "" : verr === null;

  return (
    <div className="console-body">
      <QueryContextStrip details={details} />
      <QueryForm name={name} spec={spec} details={details} onChange={setSpec} />
      <GuardBanner guards={guards} />
      <div className="form-actions">
        <button className="btn-primary" onClick={() => run.mutate(serializeSpec(spec))}
                disabled={!ready || errors.length > 0 || blocked || run.isPending}>Run</button>
      </div>
      {errors.length > 0 && <p role="alert">Fix filter errors: {errors.map((e) => e.message).join("; ")}</p>}
      {run.error && <p role="alert">Query failed - {interpretQueryError((run.error as Error).message, { details })}</p>}
      {run.data && <ResultsPanel hits={run.data.hits} metric={metric} keys={keyNames} />}
    </div>
  );
}
