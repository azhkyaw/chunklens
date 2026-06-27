import { useState } from "react";
import { useRunQuery } from "../../api/hooks";

export function QueryPanel({ name }: { name: string }) {
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const [filterError, setFilterError] = useState<string | null>(null);
  const run = useRunQuery(name);

  function onRun() {
    let where: Record<string, unknown> | undefined;
    if (filter.trim()) {
      try {
        where = JSON.parse(filter);
      } catch {
        setFilterError("Filter must be valid JSON");
        return;
      }
    }
    setFilterError(null);
    run.mutate({ query_text: text, n_results: 10, where });
  }

  return (
    <section style={{ marginTop: 16 }}>
      <h3>Query</h3>
      <label>
        Query text{" "}
        <input value={text} onChange={(e) => setText(e.target.value)} />
      </label>{" "}
      <label>
        Filter (JSON){" "}
        <input
          value={filter}
          placeholder='{"lang": "en"}'
          onChange={(e) => setFilter(e.target.value)}
        />
      </label>{" "}
      <button onClick={onRun} disabled={!text || run.isPending}>
        Run
      </button>
      {filterError && <p role="alert">{filterError}</p>}
      {run.error && <p role="alert">Query failed.</p>}
      <ol>
        {run.data?.hits.map((h) => (
          <li key={h.id}>
            {h.id} - {h.distance.toFixed(4)}
            {h.document ? `: ${h.document}` : ""}
          </li>
        ))}
      </ol>
    </section>
  );
}
