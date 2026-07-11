import { useSyncExternalStore } from "react";
import { cycleThemePref, getThemePref, subscribeTheme } from "./lib/prefs";

const GLYPH = { system: "◐", light: "○", dark: "●" } as const;

export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribeTheme, getThemePref);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Theme: ${pref}`}
      title={`Theme: ${pref} (click to change)`}
      onClick={cycleThemePref}
    >
      <span aria-hidden="true">{GLYPH[pref]}</span>
    </button>
  );
}
