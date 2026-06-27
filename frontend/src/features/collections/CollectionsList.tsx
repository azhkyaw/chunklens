import { useCollections } from "../../api/hooks";

export function CollectionsList({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const { data, isLoading, error } = useCollections();
  if (isLoading) return <p>Loading collections…</p>;
  if (error) return <p role="alert">Failed to load collections.</p>;
  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {(data ?? []).map((c) => (
        <li key={c.name}>
          <button
            onClick={() => onSelect(c.name)}
            aria-pressed={selected === c.name}
            style={{ width: "100%", textAlign: "left" }}
          >
            {c.name} ({c.count})
          </button>
        </li>
      ))}
    </ul>
  );
}
