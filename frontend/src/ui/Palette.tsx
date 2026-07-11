import { useEffect, useRef } from "react";
import { Command } from "cmdk";
import { Modal } from "./Modal";

export interface PaletteCommand {
  group: string;
  label: string;
  keywords?: string[];
  run: () => void;
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
}: {
  commands: PaletteCommand[];
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // React applies <input autoFocus> during the commit LAYOUT phase (native
  // DOM autofocus emulation), which always finishes, for the whole tree,
  // before ANY passive effect runs. Modal's own mount effect (a plain
  // useEffect - passive) focuses the dialog itself for a11y label
  // announcement, and therefore always runs after and wins, deterministically
  // (not a flaky race - verified empirically). Re-assert focus on the input
  // on the next microtask so it settles there once Modal's effect is done.
  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  const groups: { name: string; items: PaletteCommand[] }[] = [];
  for (const c of commands) {
    const g = groups.find((x) => x.name === c.group);
    if (g) g.items.push(c);
    else groups.push({ name: c.group, items: [c] });
  }
  return (
    <Modal label="Command palette" onClose={onClose}>
      <Command label="Command palette" className="palette">
        <Command.Input
          ref={inputRef}
          autoFocus
          placeholder="Type a command or collection..."
        />
        <Command.List>
          <Command.Empty>No matching commands.</Command.Empty>
          {groups.map((g) => (
            <Command.Group key={g.name} heading={g.name}>
              {g.items.map((c) => (
                <Command.Item
                  key={c.label}
                  value={c.label}
                  keywords={c.keywords}
                  onSelect={() => {
                    // Close first: the Modal cleanup refocuses the opener, and
                    // any modal run() opens then captures that as its restore
                    // target (the Task 2 focus chain).
                    onClose();
                    c.run();
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
