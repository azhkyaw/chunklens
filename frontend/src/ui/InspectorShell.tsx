import type { ReactNode } from "react";

// The inspector frame: an open pane with an eyebrow header and close button,
// or a slim vertical reopen strip when collapsed. Content is the caller's.
export function InspectorShell({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  if (!open) {
    return (
      <aside className="inspector inspector-collapsed">
        <button
          type="button"
          className="inspector-reopen"
          aria-label="Open inspector"
          aria-expanded="false"
          onClick={onToggle}
        >
          Inspector
        </button>
      </aside>
    );
  }
  return (
    <aside className="inspector" aria-label="Inspector">
      <div className="inspector-head">
        <p className="eyebrow">Inspector</p>
        <button
          type="button"
          className="inspector-close"
          aria-label="Close inspector"
          onClick={onToggle}
        >
          ✕
        </button>
      </div>
      <div className="inspector-body">{children}</div>
    </aside>
  );
}
