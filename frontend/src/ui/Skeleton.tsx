/**
 * Shimmer loading placeholder. The container is the accessible loading
 * announcement (role=status + label); the bars are pure decoration. Variant
 * classes in styles.css section 26 size the bars to match the real rows they
 * stand in for, so content arrival causes no layout jump.
 */
export function Skeleton({
  label,
  rows = 3,
  className,
}: {
  label: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label} className={["skeleton", className].filter(Boolean).join(" ")}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skeleton-row" aria-hidden="true" />
      ))}
    </div>
  );
}
