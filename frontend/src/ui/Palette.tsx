import { Command } from "cmdk";
import { useRef } from "react";
import { Modal } from "./Modal";

export interface PaletteCommand {
  group: string;
  label: string;
  keywords?: string[];
  run: () => void;
}

// cmdk's default filter scores items by fuzzy SUBSEQUENCE matching over
// value+keywords, so an unrelated command can outrank an exact collection
// name (e.g. "demo" subsequence-matches "Toggle density" via "density" +
// "comfortable"). This filter instead requires a contiguous, case-insensitive
// substring match, ranked by a TOTAL order (no ties resolved by array/DOM
// order, which is unstable - it comes from whatever order the backend
// happened to return collections in):
//   1. an exact (case-insensitive) label match always wins outright
//   2. among label substring matches, an earlier match index ranks higher -
//      the index term DOMINATES the length term (it is lexicographic, not a
//      sum of commensurable quantities), so a prefix match on a long label
//      always beats an infix match on a short one
//   3. only once the index ties does a SHORTER target label win (mirrors
//      cmdk's own default filter, which normalizes by target length)
//   4. keyword matches rank strictly below every label match
// No match returns 0, which cmdk treats as "exclude this item".
//
// Band arithmetic (why the three bands cannot overlap for any input):
//   idx and v.length are each clamped to [0, 999] before scoring, so the
//   label-substring band 1000 * (1000 - idxC) + (1000 - lenC) is bounded to
//   [1000 * 1 + 1, 1000 * 1000 + 1000] = [1001, 1_001_000] regardless of how
//   long a real label ever gets (Chroma collection names: 3-63 chars;
//   history labels: truncated to 48 + a suffix - both far inside the clamp,
//   but the bound holds even if that changes).
//   The keyword band 1000 - idxC (idxC in [0, 999]) is bounded to [1, 1000],
//   strictly below the label band's floor of 1001, and strictly above 0.
//   The exact-match constant (2_000_000) sits strictly above the label
//   band's ceiling of 1_001_000.
//   So: exact (2_000_000) > label (1001..1_001_000) > keyword (1..1000) > 0.
function paletteFilter(value: string, search: string, keywords: string[] = []): number {
  const needle = search.trim().toLowerCase();
  if (!needle) return 1;
  const v = value.toLowerCase();
  if (v === needle) return 2_000_000;
  const idx = v.indexOf(needle);
  if (idx !== -1) {
    const idxC = Math.min(999, idx);
    const lenC = Math.min(999, v.length);
    return 1000 * (1000 - idxC) + (1000 - lenC);
  }
  let bestIdx = -1;
  for (const kw of keywords) {
    const ki = kw.toLowerCase().indexOf(needle);
    if (ki !== -1 && (bestIdx === -1 || ki < bestIdx)) bestIdx = ki;
  }
  return bestIdx !== -1 ? 1000 - Math.min(999, bestIdx) : 0;
}

/**
 * The command palette: a plain cmdk <Command> inside our own Modal, so the
 * focus trap, Escape, overlay click, and inert background all behave exactly
 * like every other overlay. cmdk supplies filtering + arrow-key selection.
 * Labels are the match values; a collection named like an action label is a
 * tolerable edge (identical values just co-highlight).
 */
export function Palette({
  commands,
  onClose,
  loading = false,
}: {
  commands: PaletteCommand[];
  onClose: () => void;
  loading?: boolean;
}) {
  const groups: { name: string; items: PaletteCommand[] }[] = [];
  for (const c of commands) {
    const g = groups.find((x) => x.name === c.group);
    if (g) g.items.push(c);
    else groups.push({ name: c.group, items: [c] });
  }
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Modal label="Command palette" onClose={onClose} initialFocus={inputRef}>
      <Command label="Command palette" className="palette" filter={paletteFilter}>
        <Command.Input ref={inputRef} placeholder="Type a command or collection..." />
        <Command.List>
          {loading && <Command.Loading>Loading collections…</Command.Loading>}
          <Command.Empty>No matching commands.</Command.Empty>
          {groups.map((g) => (
            <Command.Group key={g.name} heading={g.name}>
              {g.items.map((c) => (
                <Command.Item
                  key={c.label}
                  value={c.label}
                  keywords={c.keywords}
                  onSelect={() => {
                    // Boot race: until the collections query resolves, typing a
                    // collection name ranks some unrelated command first - Enter
                    // would run the WRONG command. Suppress selection entirely
                    // during the sub-second load; the Loading row above tells the
                    // user why. (Cp5 follow-up)
                    if (loading) return;
                    // React 18 batches onClose()'s state update and whatever
                    // c.run() triggers into ONE commit if both run
                    // synchronously here - so a modal opened by c.run() would
                    // capture its focus-restore target (Modal.tsx's
                    // restoreTo, read during render) while the palette's own
                    // <input> is still the live document.activeElement, not
                    // the palette's opener. That target is detached moments
                    // later in the same commit, so closing the new modal
                    // would call .focus() on a dead node.
                    // Deferring c.run() to a microtask lets this component
                    // actually unmount first (its own Modal cleanup restores
                    // focus to the opener), so any modal opened by the
                    // command mounts in a LATER commit and captures that
                    // now-focused, still-live opener as its restore target.
                    onClose();
                    queueMicrotask(() => c.run());
                  }}
                >
                  {c.label}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </Modal>
  );
}
