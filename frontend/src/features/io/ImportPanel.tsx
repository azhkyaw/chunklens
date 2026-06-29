import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useImportCollection } from "../../api/hooks";
import type { ExportFile } from "../../api/types";

export function ImportPanel({ onImported }: { onImported: (name: string) => void }) {
  const qc = useQueryClient();
  const imp = useImportCollection();
  const [data, setData] = useState<ExportFile | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ExportFile;
        setData(parsed);
        setName(parsed.collection?.name ?? "");
      } catch {
        setData(null);
        setError("Couldn't read that file as JSON.");
      }
    };
    reader.readAsText(file);
  }

  function submit() {
    if (!data) return;
    setError(null);
    imp.mutate(
      { data, name },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["collections"] });
          onImported(name);
        },
        onError: (e) => setError((e as Error).message),
      },
    );
  }

  return (
    <div className="form-stack">
      <p className="eyebrow">Import collection</p>
      <label className="field">Import file <input type="file" accept=".json,application/json" onChange={onFile} /></label>
      {data && <label className="field">Name <input value={name} onChange={(e) => setName(e.target.value)} /></label>}
      <div className="form-actions">
        <button type="button" className="btn-primary" onClick={submit} disabled={!data || !name || imp.isPending}>Import</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
