import { useEffect, useRef, useState } from "react";
import { useRunQuery, useCollectionDetails, useEmbedders } from "../../api/hooks";
import { QueryForm } from "./QueryForm";
import { CompareView } from "../retrieval/CompareView";
import { QueryContextStrip } from "../retrieval/QueryContextStrip";
import { GuardBanner } from "../retrieval/GuardBanner";
import { evaluateGuards, defaultQueryMode } from "../retrieval/guards";
import { interpretQueryError } from "../retrieval/errorInterpret";
import { newQuerySpec, serializeSpec, specErrors, vectorError, type QuerySpec } from "./querySpec";

export function CompareQuery({ name }: { name: string }) {
  const [specA, setSpecA] = useState<QuerySpec>(() => newQuerySpec());
  const [specB, setSpecB] = useState<QuerySpec>(() => newQuerySpec());
  const runA = useRunQuery(name);
  const runB = useRunQuery(name);
  const { data: details } = useCollectionDetails(name);
  const { data: embedders } = useEmbedders();
  const metric = details?.distance_metric ?? "l2";
  const provider = details ? (embedders ?? []).find((e) => e.id === details.embedding_function) : undefined;

  const appliedFor = useRef<string | null>(null);
  useEffect(() => {
    if (details && embedders && appliedFor.current !== name) {
      appliedFor.current = name;
      const m = defaultQueryMode(details, embedders.map((e) => e.id));
      setSpecA((s) => ({ ...s, mode: m }));
      setSpecB((s) => ({ ...s, mode: m }));
    }
  }, [details, embedders, name]);

  const verrA = vectorError(specA, details);
  const verrB = vectorError(specB, details);
  const guardsA = evaluateGuards({ details, mode: specA.mode, text: specA.text, hasEmbedding: specA.mode === "vector" && verrA === null, providerDetected: provider !== undefined });
  const guardsB = evaluateGuards({ details, mode: specB.mode, text: specB.text, hasEmbedding: specB.mode === "vector" && verrB === null, providerDetected: provider !== undefined });
  const blocked = [...guardsA, ...guardsB].some((g) => g.level === "block");
  const invalid = specErrors(specA).length > 0 || specErrors(specB).length > 0;
  const pending = runA.isPending || runB.isPending;
  const readyA = specA.mode === "text" ? specA.text.trim() !== "" : verrA === null;
  const readyB = specB.mode === "text" ? specB.text.trim() !== "" : verrB === null;

  function runBoth() {
    runA.mutate(serializeSpec(specA));
    runB.mutate(serializeSpec(specB));
  }

  return (
    <div className="console-body">
      <QueryContextStrip details={details} />
      <div className="compare-forms">
        <div className="compare-col"><p className="eyebrow">Input A</p><QueryForm name={name} spec={specA} details={details} onChange={setSpecA} /><GuardBanner guards={guardsA} /></div>
        <div className="compare-col"><p className="eyebrow">Input B</p><QueryForm name={name} spec={specB} details={details} onChange={setSpecB} /><GuardBanner guards={guardsB} /></div>
      </div>
      <div className="form-actions">
        <button className="btn-primary" onClick={runBoth} disabled={!readyA || !readyB || invalid || blocked || pending}>Run both</button>
      </div>
      {runA.error && <p role="alert">Query A failed - {interpretQueryError((runA.error as Error).message, { details })}</p>}
      {runB.error && <p role="alert">Query B failed - {interpretQueryError((runB.error as Error).message, { details })}</p>}
      {runA.data && runB.data && <CompareView a={runA.data} b={runB.data} metric={metric} />}
    </div>
  );
}
