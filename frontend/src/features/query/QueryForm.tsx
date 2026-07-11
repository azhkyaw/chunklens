import { useEffect } from "react";
import { useMetadataKeys, useEmbedders } from "../../api/hooks";
import { FilterBuilder } from "../filters/FilterBuilder";
import { showsEmbedderPicker } from "../retrieval/guards";
import { EmbedderPicker } from "./EmbedderPicker";
import { vectorError, type QuerySpec } from "./querySpec";
import type { CollectionDetails } from "../../api/types";

export function QueryForm({
  name, spec, details, onChange, inputRef,
}: {
  name: string;
  spec: QuerySpec;
  details?: CollectionDetails;
  onChange: (s: QuerySpec) => void;
  inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
}) {
  const { data: keysData } = useMetadataKeys(name);
  const { data: embedders } = useEmbedders();
  const keys = keysData?.keys ?? [];
  const verr = vectorError(spec, details);

  const provider = details ? (embedders ?? []).find((e) => e.id === details.embedding_function) : undefined;
  const showPicker = spec.mode === "text" && showsEmbedderPicker(details);

  // Pre-fill the picker once: saved hint -> auto-detected provider. Skips if the user
  // has already chosen an embedder this session (spec.embedder set). This sets state
  // only; persistence happens on explicit user interaction inside EmbedderPicker.
  useEffect(() => {
    if (spec.mode !== "text" || spec.embedder) return;
    const hint = details?.embedder_hint;
    if (hint) {
      onChange({ ...spec, embedder: { provider: hint.provider, model: hint.model ?? "" } });
      return;
    }
    if (provider) onChange({ ...spec, embedder: { provider: provider.id, model: "" } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details?.embedder_hint?.provider, provider?.id, spec.mode]);

  return (
    <div className="query-form">
      <div role="tablist" className="tabs query-mode" aria-label="Query input mode">
        <button type="button" role="tab" className="tab" aria-selected={spec.mode === "text"}
                onClick={() => onChange({ ...spec, mode: "text" })}>Text</button>
        <button type="button" role="tab" className="tab" aria-selected={spec.mode === "vector"}
                onClick={() => onChange({ ...spec, mode: "vector" })}>Vector</button>
      </div>
      <div className="form-row">
        {spec.mode === "vector" ? (
          <label className="field" style={{ flex: 1 }}>Query vector
            <textarea ref={inputRef as React.Ref<HTMLTextAreaElement>} value={spec.vector} rows={3} placeholder="[0.1, 0.2, ...]"
                      onChange={(e) => onChange({ ...spec, vector: e.target.value })} /></label>
        ) : (
          <label className="field" style={{ flex: 1 }}>Query text
            <input ref={inputRef as React.Ref<HTMLInputElement>} value={spec.text} onChange={(e) => onChange({ ...spec, text: e.target.value })} /></label>
        )}
        <label className="field" style={{ width: 96 }}>n_results <input type="number" min={1} value={spec.nResults}
          onChange={(e) => onChange({ ...spec, nResults: Math.max(1, Number(e.target.value) || 1) })} /></label>
      </div>
      {showPicker && (
        <EmbedderPicker name={name} details={details} embedders={embedders ?? []} spec={spec} onChange={onChange} />
      )}
      {spec.mode === "vector" && details?.dimensionality != null && (
        <p className="faint">expects {details.dimensionality}-dim</p>
      )}
      {spec.mode === "vector" && verr && spec.vector.trim() !== "" && <p role="alert">{verr}</p>}
      {keysData && <p className="faint query-keys">keys from {keysData.sampled} of {keysData.total} records</p>}
      <FilterBuilder title="Metadata filter (where)" lang="where" tree={spec.whereTree} keys={keys}
        onChange={(t) => onChange({ ...spec, whereTree: t })} />
      <FilterBuilder title="Document filter (where_document)" lang="where_document" tree={spec.docTree} keys={keys}
        onChange={(t) => onChange({ ...spec, docTree: t })} />
    </div>
  );
}
