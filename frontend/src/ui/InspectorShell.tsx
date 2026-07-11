import type React from "react";
import type { ReactNode } from "react";

// The inspector frame: an open pane with an eyebrow header and close button,
// or a slim vertical reopen strip when collapsed. Content is the caller's.
export function InspectorShell({
  open,
  onToggle,
  paneRef,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  paneRef?: React.Ref<HTMLElement>;
  children: ReactNode;
}) {
  if (!open) {
    return (
      <div className="inspector inspector-collapsed">
        <button
          type="button"
          className="inspector-reopen"
          aria-label="Open inspector"
          aria-expanded="false"
          onClick={onToggle}
        >
          Inspector
        </button>
      </div>
    );
  }
  return (
    <aside className="inspector" aria-label="Inspector" ref={paneRef} tabIndex={-1}>
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
