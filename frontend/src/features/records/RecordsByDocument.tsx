import { useState } from "react";
import { useMetadataKeys, useSources } from "../../api/hooks";
import { PROVENANCE_KEYS } from "../retrieval/provenance";
import { DocChunks } from "./DocChunks";

export function RecordsByDocument({ name }: { name: string }) {
  const { data: keysData } = useMetadataKeys(name);
  const stringKeys = (keysData?.keys ?? []).filter((k) => k.types.length === 1 && k.types[0] === "string").map((k) => k.key);
  // Prefer the highest-priority provenance key (PROVENANCE_KEYS order: source > path > url >
  // page > doc_id > title) rather than the first match in alphabetical key order - otherwise an
  // id-ish key like doc_id wins over a human-readable source purely because "d" < "s".
  const autoKey =
    PROVENANCE_KEYS.map((pk) => stringKeys.find((k) => k.toLowerCase() === pk)).find(Boolean) ??
    stringKeys[0] ??
    "";
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
              // "(none)" is the backend sentinel for records missing the key; "" is a
              // present-but-empty value. Neither can be fetched as a source filter.
              const expandable = s.value !== "(none)" && s.value !== "";
              const isOpen = open === s.value;
              return (
                <li key={s.value} className="doc-item">
                  <button type="button" className="doc-head" aria-expanded={isOpen} disabled={!expandable}
                          onClick={() => setOpen(isOpen ? null : s.value)}>
                    <span className="doc-value">{s.value === "" ? "(empty)" : s.value}</span>
                    <span className="doc-count">{s.count} chunk{s.count === 1 ? "" : "s"}</span>
                  </button>
                  {!expandable && (
                    <span className="faint"> · {s.value === "" ? `empty ${key} value` : `no ${key} value`}</span>
                  )}
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
