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
 * accessible label is announced) unless the caller names an `initialFocus`
 * target (e.g. a search input), Tab wraps inside, Escape and overlay clicks
 * close, and focus returns to the opener on unmount.
 */
export function Modal({
  label,
  onClose,
  initialFocus,
  children,
}: {
  label: string;
  onClose: () => void;
  /** Focus this element on open instead of the dialog itself (e.g. a search input). */
  initialFocus?: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Captured during render, not in the effect: a child's autoFocus fires in the
  // commit (layout) phase, BEFORE passive effects, so by effect time
  // document.activeElement could already be a control inside this dialog.
  const restoreTo = useRef<HTMLElement | null>(null);
  if (restoreTo.current === null) {
    restoreTo.current = document.activeElement as HTMLElement | null;
  }

  useEffect(() => {
    // Focus the caller's target if it named one, else the dialog itself (so its
    // accessible label is announced). This runs unconditionally: StrictMode
    // double-invokes effects (setup, simulated cleanup, setup), and the cleanup
    // restores focus to the opener - so setup must re-establish focus every time
    // rather than testing where focus currently is.
    (initialFocus?.current ?? ref.current)?.focus();
    setShellInert(true);
    return () => {
      // Un-inert first so the restore target is focusable again.
      setShellInert(false);
      restoreTo.current?.focus();
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
