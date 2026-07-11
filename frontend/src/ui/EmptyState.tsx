import type { ReactNode } from "react";

/**
 * The app's one empty state: block mark, terse title, muted hint, optional
 * action row. Every "nothing here" surface renders through this, so a user who
 * has learned to read one has learned to read all of them.
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
