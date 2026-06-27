import { useState } from "react";
import { useRecords } from "../../api/hooks";

const PAGE = 25;

export function RecordsTable({ name }: { name: string }) {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error } = useRecords(name, PAGE, offset);
  if (isLoading) return <p>Loading records…</p>;
  if (error) return <p role="alert">Failed to load records.</p>;
  const page = data!;
  return (
    <div>
      <table>
        <thead>
          <tr><th>ID</th><th>Document</th><th>Metadata</th></tr>
        </thead>
        <tbody>
          {page.items.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.document}</td>
              <td><code>{JSON.stringify(r.metadata)}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
          Prev
        </button>
        <span>
          {page.total === 0 ? 0 : offset + 1}–{Math.min(offset + PAGE, page.total)} of {page.total}
        </span>
        <button disabled={offset + PAGE >= page.total} onClick={() => setOffset(offset + PAGE)}>
          Next
        </button>
      </div>
    </div>
  );
}
