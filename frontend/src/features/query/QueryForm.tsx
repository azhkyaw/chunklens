import { useMetadataKeys } from "../../api/hooks";
import { FilterBuilder } from "../filters/FilterBuilder";
import type { QuerySpec } from "./querySpec";

export function QueryForm({
  name, spec, onChange,
}: { name: string; spec: QuerySpec; onChange: (s: QuerySpec) => void }) {
  const { data: keysData } = useMetadataKeys(name);
  const keys = keysData?.keys ?? [];
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label>Query text <input value={spec.text} onChange={(e) => onChange({ ...spec, text: e.target.value })} /></label>
        <label>n_results <input type="number" min={1} value={spec.nResults}
          onChange={(e) => onChange({ ...spec, nResults: Math.max(1, Number(e.target.value) || 1) })} style={{ width: 60 }} /></label>
      </div>
      {keysData && <p style={{ fontSize: 12, color: "#666" }}>keys from {keysData.sampled} of {keysData.total} records</p>}
      <FilterBuilder title="Metadata filter (where)" lang="where" tree={spec.whereTree} keys={keys}
        onChange={(t) => onChange({ ...spec, whereTree: t })} />
      <FilterBuilder title="Document filter (where_document)" lang="where_document" tree={spec.docTree} keys={keys}
        onChange={(t) => onChange({ ...spec, docTree: t })} />
    </div>
  );
}
