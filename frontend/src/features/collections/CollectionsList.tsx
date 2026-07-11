import { useCollections } from "../../api/hooks";
import { EmptyState } from "../../ui/EmptyState";
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
  // No hint or actions here: the rail is narrow, and the main pane already
  // carries the hero that explains what to do about this exact state. The
  // wording matches it so one condition does not speak with two voices.
  if (items.length === 0) return <EmptyState className="rail-empty" title="no collections yet" />;
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
