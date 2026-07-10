import { useState } from "react";
import { getThemePref, setThemePref, type ThemePref } from "./lib/prefs";

const ORDER: ThemePref[] = ["system", "light", "dark"];
const GLYPH: Record<ThemePref, string> = { system: "◐", light: "○", dark: "●" };

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>(getThemePref);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    setThemePref(next);
    setPref(next);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Theme: ${pref}`}
      title={`Theme: ${pref} (click to change)`}
      onClick={cycle}
    >
      <span aria-hidden="true">{GLYPH[pref]}</span>
    </button>
  );
}
