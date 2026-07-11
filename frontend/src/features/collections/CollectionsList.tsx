import { useCollections } from "../../api/hooks";
import { ErrorState } from "../../ui/ErrorState";
import { Skeleton } from "../../ui/Skeleton";

export function CollectionsList({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  const { data, isLoading, error, refetch } = useCollections();
  if (isLoading) return <Skeleton label="Loading collections" rows={4} className="skeleton-rail" />;
  if (error) return <ErrorState message="Failed to load collections." onRetry={() => refetch()} />;
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
