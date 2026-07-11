import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Reference-counted so stacked overlays (palette opening a modal) keep the
// shell inert until the last one closes. React 18 has no inert JSX prop, so
// the attribute is set imperatively.
let inertCount = 0;
function setShellInert(on: boolean) {
  // Count first: React detaches the DOM (mutation phase) before useEffect
  // cleanups run (passive phase), so on a full unmount .app is already gone.
  // Gating the counter on the lookup would skip the decrement and leave a
  // future shell stuck inert.
  inertCount = Math.max(0, inertCount + (on ? 1 : -1));
  const shell = document.querySelector(".app");
  if (!shell) return;
  if (inertCount > 0) shell.setAttribute("inert", "");
  else shell.removeAttribute("inert");
}

/**
 * Focus-trapped modal dialog. Focus starts on the dialog itself (so the
 * accessible label is announced), Tab wraps inside, Escape and overlay
 * clicks close, and focus returns to the opener on unmount.
 */
export function Modal({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    setShellInert(true);
    return () => {
      // Un-inert first so the restore target is focusable again.
      setShellInert(false);
      previous?.focus();
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const dialog = ref.current;
    if (!dialog) return;
    const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        ref={ref}
        className="panel modal-card"
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
