import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { QueryHit, RecordRow } from "../api/types";

// The selection carries the full entity payload (not just an id) so the
// inspector renders without refetching what the table already has. `metric`
// rides along on hits because interpreting a distance needs it.
export type Selection =
  | { kind: "record"; record: RecordRow }
  | { kind: "hit"; hit: QueryHit; rank: number; metric: string; side?: "A" | "B"; delta?: number | null }
  | { kind: "source"; sourceKey: string; value: string; count: number };

interface SelectionContextValue {
  selection: Selection | null;
  select: (s: Selection | null) => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

// Selection resets when resetKey (collection/tab) changes. Deriving from the
// stored key instead of remounting keeps children mounted and avoids a render
// with a stale selection.
export function SelectionProvider({ resetKey, children }: { resetKey: string; children: ReactNode }) {
  const [state, setState] = useState<{ key: string; sel: Selection | null }>({
    key: resetKey,
    sel: null,
  });
  const selection = state.key === resetKey ? state.sel : null;
  const select = useCallback(
    (sel: Selection | null) => setState({ key: resetKey, sel }),
    [resetKey],
  );
  return (
    <SelectionContext.Provider value={{ selection, select }}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used inside a SelectionProvider");
  return ctx;
}
