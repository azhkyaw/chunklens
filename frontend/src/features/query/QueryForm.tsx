import { useMetadataKeys } from "../../api/hooks";
import { FilterBuilder } from "../filters/FilterBuilder";
import { vectorError, type QuerySpec } from "./querySpec";
import type { CollectionDetails } from "../../api/types";

export function QueryForm({
  name, spec, details, onChange,
}: { name: string; spec: QuerySpec; details?: CollectionDetails; onChange: (s: QuerySpec) => void }) {
  const { data: keysData } = useMetadataKeys(name);
  const keys = keysData?.keys ?? [];
  const verr = vectorError(spec, details);
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
            <textarea value={spec.vector} rows={3} placeholder="[0.1, 0.2, ...]"
                      onChange={(e) => onChange({ ...spec, vector: e.target.value })} /></label>
        ) : (
          <label className="field" style={{ flex: 1 }}>Query text
            <input value={spec.text} onChange={(e) => onChange({ ...spec, text: e.target.value })} /></label>
        )}
        <label className="field" style={{ width: 96 }}>n_results <input type="number" min={1} value={spec.nResults}
          onChange={(e) => onChange({ ...spec, nResults: Math.max(1, Number(e.target.value) || 1) })} /></label>
      </div>
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
