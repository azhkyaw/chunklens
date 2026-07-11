import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useClearCollectionEmbedder, useSetCollectionEmbedder, useSetEmbedderKey,
} from "../../api/hooks";
import type { CollectionDetails, EmbedderInfo } from "../../api/types";
import { toastError, toastSuccess } from "../../ui/toast";
import type { QuerySpec } from "./querySpec";

// Advisory model suggestions per provider for the free-text Model field. chromadb's EF
// registry exposes only each provider's DEFAULT model (surfaced via EmbedderInfo.default_model),
// never a list - so these are a curated, non-exhaustive convenience. The field stays free-text:
// custom / fine-tuned / self-hosted / newly-released model names all still work. Keep current.
const MODEL_SUGGESTIONS: Record<string, string[]> = {
  openai: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
  cohere: ["embed-v4.0", "embed-english-v3.0", "embed-multilingual-v3.0", "embed-english-light-v3.0", "embed-multilingual-light-v3.0"],
  voyageai: ["voyage-3-large", "voyage-3", "voyage-3-lite", "voyage-multilingual-2", "voyage-code-3", "voyage-finance-2", "voyage-law-2"],
  jina: ["jina-embeddings-v3", "jina-embeddings-v2-base-en", "jina-embeddings-v2-base-code", "jina-embeddings-v2-base-de", "jina-embeddings-v2-base-zh"],
  ollama: ["nomic-embed-text", "mxbai-embed-large", "all-minilm", "snowflake-arctic-embed", "bge-m3"],
  sentence_transformer: ["all-MiniLM-L6-v2", "all-mpnet-base-v2", "all-MiniLM-L12-v2", "multi-qa-MiniLM-L6-cos-v1", "paraphrase-multilingual-MiniLM-L12-v2", "BAAI/bge-small-en-v1.5", "BAAI/bge-base-en-v1.5"],
};

// Datalist options = curated list + the provider's registry default, de-duplicated (so the
// blank-field default is always discoverable as an explicit option).
function modelOptions(e: EmbedderInfo): string[] {
  const curated = MODEL_SUGGESTIONS[e.id] ?? [];
  const merged = e.default_model ? [...curated, e.default_model] : curated;
  return [...new Set(merged)];
}

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
      onChange({ ...spec, embedder: null, embedderCleared: true });
      clearHint.mutate(undefined, {
        onSuccess: () => toastSuccess("Embedder hint cleared"),
        onError: (e) => toastError((e as Error).message),
      });
      return;
    }
    const model = spec.embedder?.provider === id ? (spec.embedder?.model ?? "") : "";
    const next = { provider: id, model };
    onChange({ ...spec, embedder: next, embedderCleared: false });
    setHint.mutate(next, {
      onSuccess: () => toastSuccess("Embedder hint saved"),
      onError: (e) => toastError((e as Error).message),
    });
  }
  function editModel(model: string) {
    if (spec.embedder) onChange({ ...spec, embedder: { ...spec.embedder, model } });
  }
  function saveModel() {
    if (spec.embedder?.provider) {
      setHint.mutate(spec.embedder, {
        onSuccess: () => toastSuccess("Embedder hint saved"),
        onError: (e) => toastError((e as Error).message),
      });
    }
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
            <input value={spec.embedder?.model ?? ""} list={`models-${selected.id}`}
                   placeholder={selected.default_model ? `leave blank for ${selected.default_model}` : "(provider default)"}
                   onChange={(e) => editModel(e.target.value)} onBlur={saveModel} />
            <datalist id={`models-${selected.id}`}>
              {modelOptions(selected).map((m) => <option key={m} value={m} />)}
            </datalist>
          </label>
        )}
      </div>
      {needsKey && (
        <div className="form-row">
          <label className="field" style={{ flex: 1 }}>API key
            <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} /></label>
          <button type="button" className="btn-secondary" disabled={!keyInput || setKey.isPending}
            onClick={() => setKey.mutate({ provider: selected!.id, token: keyInput }, {
              onSuccess: () => {
                setKeyInput("");
                qc.invalidateQueries({ queryKey: ["embedders"] });
                toastSuccess("API key set");
              },
              onError: (e) => toastError((e as Error).message),
            })}>
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
