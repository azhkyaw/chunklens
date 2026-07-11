/**
 * Clamped index math shared by every j/k "move selection" handler
 * (RecordsTable, SingleQuery, CompareView). No selection (current === -1)
 * jumps to the first item on +1 or the last item on -1; an existing
 * selection steps by delta and clamps at both ends - it never wraps. An
 * empty list has no valid index.
 */
export function nextIndex(length: number, current: number, delta: number): number {
  if (length === 0) return -1;
  if (current === -1) return delta > 0 ? 0 : length - 1;
  return Math.min(length - 1, Math.max(0, current + delta));
}

/**
 * Focus the element carrying data-id={id} within container (if present) and
 * scroll it into view. Used after a j/k move so DOM focus follows the
 * selection: without this, focus stays on whatever was last clicked, so
 * Enter (and assistive tech) acts on the stale element instead of the newly
 * selected one.
 */
export function focusSelected(container: HTMLElement | null, id: string): void {
  if (!container) return;
  const el = Array.from(container.querySelectorAll<HTMLElement>("[data-id]")).find(
    (n) => n.dataset.id === id,
  );
  if (!el) return;
  el.focus();
  el.scrollIntoView({ block: "nearest" });
}
