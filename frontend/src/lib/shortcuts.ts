import { useEffect, useRef } from "react";

export interface ShortcutOptions {
  /** Fire even when focus is inside an input/textarea/select/contenteditable. */
  inInputs?: boolean;
}

interface Step {
  key: string;
  mod: boolean;
}

// Grammar: "j" | "?" | "enter" | "mod+k" | "g c" (space = two-key sequence,
// "+" = modifier; "mod" means Ctrl on Windows/Linux or Cmd on macOS).
function parse(spec: string): Step[] {
  return spec.split(" ").map((part) => {
    const pieces = part.toLowerCase().split("+");
    return { key: pieces[pieces.length - 1], mod: pieces.includes("mod") };
  });
}

export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  // jsdom does not implement isContentEditable, so check the attribute.
  return (
    target.matches("input, textarea, select") ||
    target.getAttribute("contenteditable") === "true"
  );
}

export function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
}

/**
 * Register a global keyboard shortcut for the lifetime of the component.
 * Single-key and sequence bindings are typing-adjacent: they never fire from
 * an editable target and stay quiet while a dialog or menu owns the keyboard.
 * mod+ combos always fire (Ctrl-K must work from inputs and toggle an open
 * palette). Handlers are read through a ref so they see fresh state.
 */
export function useShortcut(
  spec: string,
  handler: (e: KeyboardEvent) => void,
  opts: ShortcutOptions = {},
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const { inInputs } = opts;

  useEffect(() => {
    const steps = parse(spec);
    let stepIndex = 0;
    let timer: number | undefined;

    function reset() {
      stepIndex = 0;
      window.clearTimeout(timer);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey) return reset();
      const step = steps[stepIndex];
      if (!step.mod && !inInputs) {
        if (isEditable(e.target)) return reset();
        if (document.querySelector('[role="dialog"], [role="menu"]')) return reset();
      }
      const modOk = step.mod ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
      if (!modOk || e.key.toLowerCase() !== step.key) return reset();
      if (stepIndex < steps.length - 1) {
        stepIndex += 1;
        window.clearTimeout(timer);
        timer = window.setTimeout(reset, 1000);
        e.preventDefault();
        return;
      }
      reset();
      handlerRef.current(e);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [spec, inInputs]);
}
