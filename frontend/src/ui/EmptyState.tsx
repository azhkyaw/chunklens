import type { ReactNode } from "react";

/**
 * Designed empty state in the instrument voice: block mark, terse title,
 * muted hint, optional action row. Every "nothing here" surface in the app
 * renders through this so the voice stays uniform.
 */
export function EmptyState({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={["empty-state", className].filter(Boolean).join(" ")}>
      <span className="empty-mark" aria-hidden="true" />
      <p className="empty-title">{title}</p>
      {hint && <p className="muted">{hint}</p>}
      {children && <div className="empty-actions">{children}</div>}
    </div>
  );
}
