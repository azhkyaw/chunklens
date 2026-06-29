import { useState } from "react";
import { useRunQuery, useCollectionDetails } from "../../api/hooks";
import { QueryForm } from "./QueryForm";
import { CompareView } from "../retrieval/CompareView";
import { QueryContextStrip } from "../retrieval/QueryContextStrip";
import { GuardBanner } from "../retrieval/GuardBanner";
import { evaluateGuards } from "../retrieval/guards";
import { interpretQueryError } from "../retrieval/errorInterpret";
import { newQuerySpec, serializeSpec, specErrors, type QuerySpec } from "./querySpec";

export function CompareQuery({ name }: { name: string }) {
  const [specA, setSpecA] = useState<QuerySpec>(() => newQuerySpec());
  const [specB, setSpecB] = useState<QuerySpec>(() => newQuerySpec());
  const runA = useRunQuery(name);
  const runB = useRunQuery(name);
  const { data: details } = useCollectionDetails(name);
  const metric = details?.distance_metric ?? "l2";
  const guardsA = evaluateGuards({ details, text: specA.text, hasEmbedding: false });
  const guardsB = evaluateGuards({ details, text: specB.text, hasEmbedding: false });
  const blocked = [...guardsA, ...guardsB].some((g) => g.level === "block");
  const invalid = specErrors(specA).length > 0 || specErrors(specB).length > 0;
  const pending = runA.isPending || runB.isPending;

  function runBoth() {
    runA.mutate(serializeSpec(specA));
    runB.mutate(serializeSpec(specB));
  }

  return (
    <div className="console-body">
      <QueryContextStrip details={details} />
      <div className="compare-forms">
        <div className="compare-col"><p className="eyebrow">Input A</p><QueryForm name={name} spec={specA} onChange={setSpecA} /><GuardBanner guards={guardsA} /></div>
        <div className="compare-col"><p className="eyebrow">Input B</p><QueryForm name={name} spec={specB} onChange={setSpecB} /><GuardBanner guards={guardsB} /></div>
      </div>
      <div className="form-actions">
        <button className="btn-primary" onClick={runBoth} disabled={!specA.text || !specB.text || invalid || blocked || pending}>Run both</button>
      </div>
      {runA.error && <p role="alert">Query A failed - {interpretQueryError((runA.error as Error).message, { details })}</p>}
      {runB.error && <p role="alert">Query B failed - {interpretQueryError((runB.error as Error).message, { details })}</p>}
      {runA.data && runB.data && <CompareView a={runA.data} b={runB.data} metric={metric} />}
    </div>
  );
}
