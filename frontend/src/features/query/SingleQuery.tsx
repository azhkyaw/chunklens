import { useEffect, useRef, useState } from "react";
import { useRunQuery, useCollectionDetails, useMetadataKeys, useEmbedders, useConnection } from "../../api/hooks";
import { useSelection } from "../../lib/selection";
import { focusSelected, nextIndex } from "../../lib/selectionMove";
import { useShortcut } from "../../lib/shortcuts";
import { copyText } from "../../lib/copy";
import { queryAsJs, queryAsPython } from "../../lib/copyAsCode";
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
  const { data: embedders } = useEmbedders();
  const { data: conn } = useConnection();
  const { selection, select } = useSelection();
  const queryInput = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  // Set only by a j/k move (never a click - the browser already focuses a
  // clicked hit natively) so the effect below knows when to steal focus.
  const focusPending = useRef(false);
  const metric = details?.distance_metric ?? "l2";
  const keyNames = (keysData?.keys ?? []).map((k) => k.key);
  const provider = details ? (embedders ?? []).find((e) => e.id === details.embedding_function) : undefined;

  useShortcut("/", (e) => {
    e.preventDefault(); // keep the slash out of the freshly focused field
    queryInput.current?.focus();
  });
  useShortcut("j", () => moveHit(1));
  useShortcut("k", () => moveHit(-1));

  // j/k move the selection state, but Enter is handled by whichever element
  // holds DOM focus. Without moving focus too, the still-focused hit button
  // from the last click re-fires its click on Enter and the selection snaps
  // back. Runs after render so the newly selected hit's button already exists.
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    if (selection?.kind === "hit") focusSelected(resultsRef.current, selection.hit.id);
  }, [selection]);

  function moveHit(delta: number) {
    const hits = run.data?.hits ?? [];
    if (hits.length === 0) return;
    const cur =
      selection?.kind === "hit" ? hits.findIndex((h) => h.id === selection.hit.id) : -1;
    const next = nextIndex(hits.length, cur, delta);
    if (next === cur) return;
    focusPending.current = true;
    select({ kind: "hit", hit: hits[next], rank: next + 1, metric });
  }

  const appliedFor = useRef<string | null>(null);
  useEffect(() => {
    if (details && embedders && appliedFor.current !== name) {
      appliedFor.current = name;
      setSpec((s) => ({ ...s, mode: defaultQueryMode(details, embedders.map((e) => e.id), Boolean(details.embedder_hint)) }));
    }
  }, [details, embedders, name]);

  const errors = specErrors(spec);
  const verr = vectorError(spec, details);
  const guards = evaluateGuards({ details, mode: spec.mode, text: spec.text, hasEmbedding: spec.mode === "vector" && verr === null, embedderSelected: provider !== undefined || Boolean(spec.embedder?.provider) });
  const blocked = guards.some((g) => g.level === "block");
  const ready = spec.mode === "text" ? spec.text.trim() !== "" : verr === null;

  return (
    <div className="console-body" ref={resultsRef}>
      <QueryContextStrip details={details} />
      <QueryForm name={name} spec={spec} details={details} onChange={setSpec} inputRef={queryInput} />
      <GuardBanner guards={guards} />
      <div className="form-actions">
        <button className="btn-primary" onClick={() => run.mutate(serializeSpec(spec))}
                disabled={!ready || errors.length > 0 || blocked || run.isPending}>Run</button>
        <button type="button" className="btn-sm" disabled={!ready || errors.length > 0 || !conn}
                onClick={() => conn && copyText(queryAsPython(conn, name, serializeSpec(spec)), "Python snippet")}>
          Copy Python
        </button>
        <button type="button" className="btn-sm" disabled={!ready || errors.length > 0 || !conn}
                onClick={() => conn && copyText(queryAsJs(conn, name, serializeSpec(spec)), "JS snippet")}>
          Copy JS
        </button>
      </div>
      {errors.length > 0 && <p role="alert">Fix filter errors: {errors.map((e) => e.message).join("; ")}</p>}
      {run.error && <p role="alert">Query failed - {interpretQueryError((run.error as Error).message, { details })}</p>}
      {run.data && <ResultsPanel hits={run.data.hits} metric={metric} keys={keyNames} latencyMs={run.data.ms} />}
    </div>
  );
}
