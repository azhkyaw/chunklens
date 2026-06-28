import { isProvenanceKey } from "./provenance";

const URL_RE = /^https?:\/\/\S+$/i;

export function MetadataTable({ metadata }: { metadata: Record<string, unknown> | null }) {
  const entries = Object.entries(metadata ?? {});
  if (entries.length === 0) return <p>no metadata</p>;
  return (
    <table>
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} data-provenance={isProvenanceKey(k) ? "true" : undefined}>
            <th scope="row">{k}</th>
            <td>{renderValue(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderValue(v: unknown) {
  const s = String(v);
  if (URL_RE.test(s)) {
    return <a href={s} target="_blank" rel="noreferrer">{s}</a>;
  }
  return s;
}
