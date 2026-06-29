import { useState } from "react";
import { useMetadataKeys, useSources } from "../../api/hooks";
import { isProvenanceKey } from "../retrieval/provenance";
import { DocChunks } from "./DocChunks";

export function RecordsByDocument({ name }: { name: string }) {
  const { data: keysData } = useMetadataKeys(name);
  const stringKeys = (keysData?.keys ?? []).filter((k) => k.types.includes("string")).map((k) => k.key);
  const autoKey = stringKeys.find((k) => isProvenanceKey(k)) ?? stringKeys[0] ?? "";
  const [picked, setPicked] = useState<string | null>(null);
  const key = picked ?? autoKey;

  const { data, isLoading, error } = useSources(name, key || null);
  const [open, setOpen] = useState<string | null>(null);

  if (keysData && stringKeys.length === 0) {
    return <p className="muted">This collection has no string metadata to group by.</p>;
  }

  return (
    <div className="records-by-doc">
      <label className="field field-inline">Group by
        <select value={key} onChange={(e) => { setPicked(e.target.value); setOpen(null); }}>
          {stringKeys.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>

      {isLoading && <p className="muted">Scanning documents…</p>}
      {error && <p role="alert">Failed to list documents.</p>}
      {data && (
        <>
          {data.scanned < data.total && (
            <p className="faint">
              {data.sources.length} documents from the first {data.scanned} of {data.total} records
            </p>
          )}
          <ul className="doc-list">
            {data.sources.map((s) => {
              const expandable = s.value !== "(none)";
              const isOpen = open === s.value;
              return (
                <li key={s.value} className="doc-item">
                  <button type="button" className="doc-head" aria-expanded={isOpen} disabled={!expandable}
                          onClick={() => setOpen(isOpen ? null : s.value)}>
                    <span className="doc-value">{s.value}</span>
                    <span className="doc-count">{s.count} chunk{s.count === 1 ? "" : "s"}</span>
                  </button>
                  {!expandable && <span className="faint"> · no {key} value</span>}
                  {isOpen && expandable && <DocChunks name={name} sourceKey={key} value={s.value} />}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
