import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useClearCollectionEmbedder, useSetCollectionEmbedder, useSetEmbedderKey,
} from "../../api/hooks";
import type { CollectionDetails, EmbedderInfo } from "../../api/types";
import type { QuerySpec } from "./querySpec";

export function EmbedderPicker({
  name, details, embedders, spec, onChange,
}: {
  name: string;
  details?: CollectionDetails;
  embedders: EmbedderInfo[];
  spec: QuerySpec;
  onChange: (s: QuerySpec) => void;
}) {
  const qc = useQueryClient();
  const setHint = useSetCollectionEmbedder(name);
  const clearHint = useClearCollectionEmbedder(name);
  const setKey = useSetEmbedderKey();
  const [keyInput, setKeyInput] = useState("");

  const selectedId = spec.embedder?.provider ?? "";
  const selected = embedders.find((e) => e.id === selectedId);
  const needsKey = Boolean(selected?.needs_key && !selected.key_set && !selected.env_key);

  function pickProvider(id: string) {
    if (!id) {
      onChange({ ...spec, embedder: null });
      clearHint.mutate();
      return;
    }
    const model = spec.embedder?.provider === id ? (spec.embedder?.model ?? "") : "";
    const next = { provider: id, model };
    onChange({ ...spec, embedder: next });
    setHint.mutate(next);
  }
  function editModel(model: string) {
    if (spec.embedder) onChange({ ...spec, embedder: { ...spec.embedder, model } });
  }
  function saveModel() {
    if (spec.embedder?.provider) setHint.mutate(spec.embedder);
  }

  return (
    <div className="embedder-row">
      <div className="form-row">
        <label className="field" style={{ flex: 1 }}>Embed query with
          <select value={selectedId} onChange={(e) => pickProvider(e.target.value)}>
            <option value="">- none -</option>
            {embedders.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}{e.sdk_available ? "" : " (needs install)"}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <label className="field" style={{ flex: 1 }}>Model
            <input value={spec.embedder?.model ?? ""} placeholder="(provider default)"
                   onChange={(e) => editModel(e.target.value)} onBlur={saveModel} /></label>
        )}
      </div>
      {needsKey && (
        <div className="form-row">
          <label className="field" style={{ flex: 1 }}>API key
            <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} /></label>
          <button type="button" className="btn-secondary" disabled={!keyInput || setKey.isPending}
            onClick={() => setKey.mutate({ provider: selected!.id, token: keyInput },
              { onSuccess: () => { setKeyInput(""); qc.invalidateQueries({ queryKey: ["embedders"] }); } })}>
            Set key
          </button>
        </div>
      )}
      {details?.dimensionality != null && (
        <p className="faint">
          this collection is {details.dimensionality}-dim · make sure the model matches what created these vectors
        </p>
      )}
    </div>
  );
}
