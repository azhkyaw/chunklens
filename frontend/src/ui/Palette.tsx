import { Command } from "cmdk";
import { useRef } from "react";
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
  const groups: { name: string; items: PaletteCommand[] }[] = [];
  for (const c of commands) {
    const g = groups.find((x) => x.name === c.group);
    if (g) g.items.push(c);
    else groups.push({ name: c.group, items: [c] });
  }
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Modal label="Command palette" onClose={onClose} initialFocus={inputRef}>
      <Command label="Command palette" className="palette">
        <Command.Input ref={inputRef} placeholder="Type a command or collection..." />
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
