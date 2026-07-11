import { isMac } from "../lib/shortcuts";
import { Kbd } from "./Kbd";
import { Modal } from "./Modal";

const ROWS: [string[], string][] = [
  [["mod", "K"], "Command palette"],
  [["J"], "Next row or hit"],
  [["K"], "Previous row or hit"],
  [["Enter"], "Focus the inspector"],
  [["I"], "Toggle the inspector"],
  [["/"], "Focus the query input"],
  [["["], "Previous tab"],
  [["]"], "Next tab"],
  [["G", "C"], "Focus the collections rail"],
  [["?"], "This cheat sheet"],
  [["Esc"], "Close or blur"],
];

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <Modal label="Keyboard shortcuts" onClose={onClose}>
      <p className="eyebrow">Keyboard shortcuts</p>
      <dl className="shortcuts-list">
        {ROWS.map(([keys, desc]) => (
          <div key={desc} className="shortcuts-row">
            <dt>
              {keys.map((k) => (
                <Kbd key={k}>{k === "mod" ? (isMac() ? "⌘" : "Ctrl") : k}</Kbd>
              ))}
            </dt>
            <dd>{desc}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
