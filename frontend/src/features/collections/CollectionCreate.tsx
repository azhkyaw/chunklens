import { useState } from "react";
import { useCreateCollection } from "../../api/hooks";
import type { DistanceMetric } from "../../api/types";
import { MetadataEditor, parseScalarMetadata } from "./MetadataEditor";

export function CollectionCreate({ onCreated }: { onCreated: (name: string) => void }) {
  const create = useCreateCollection();
  const [name, setName] = useState("");
  const [metric, setMetric] = useState<DistanceMetric>("l2");
  const [ef, setEf] = useState<"default" | "none">("default");
  const [metaText, setMetaText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let metadata;
    try {
      metadata = parseScalarMetadata(metaText);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    create.mutate(
      { name, distance_metric: metric, embedding_function: ef, metadata },
      {
        onSuccess: (d) => onCreated(d.name),
        onError: (err) => setError((err as Error).message),
      },
    );
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <p className="eyebrow">New collection</p>
      <label className="field">Name <input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <div className="form-row">
        <label className="field" style={{ flex: 1 }}>
          Distance
          <select value={metric} onChange={(e) => setMetric(e.target.value as DistanceMetric)}>
            <option value="l2">l2</option>
            <option value="cosine">cosine</option>
            <option value="ip">ip</option>
          </select>
        </label>
        <label className="field" style={{ flex: 1 }}>
          Embedding function
          <select value={ef} onChange={(e) => setEf(e.target.value as "default" | "none")}>
            <option value="default">default (local ONNX)</option>
            <option value="none">none (raw vectors)</option>
          </select>
        </label>
      </div>
      <MetadataEditor value={metaText} onChange={setMetaText} label="Metadata (JSON, optional)" />
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={create.isPending || !name}>Create</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
