import { useCollections } from "../../api/hooks";

export function CollectionsList({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const { data, isLoading, error } = useCollections();
  if (isLoading) return <p className="muted rail-empty">Loading collections…</p>;
  if (error) return <p role="alert" className="rail-empty">Failed to load collections.</p>;
  const items = data ?? [];
  if (items.length === 0) return <p className="muted rail-empty">No collections yet.</p>;
  return (
    <ul className="rail-list">
      {items.map((c) => (
        <li key={c.name}>
          <button
            className="rail-item"
            onClick={() => onSelect(c.name)}
            aria-pressed={selected === c.name}
          >
            <span className="rail-name">{c.name}</span>
            <span className="rail-count">{c.count}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
