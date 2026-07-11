// Theme preference: "system" follows the OS; "light"/"dark" are explicit
// overrides. The resolved theme is always stamped on <html data-theme=...>
// so styles.css only needs the :root (dark) and [data-theme="light"] blocks.
export type ThemePref = "system" | "light" | "dark";

const KEY = "chunklens:theme";

const themeListeners = new Set<() => void>();

export function getThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

export function setThemePref(pref: ThemePref): void {
  if (pref === "system") {
    localStorage.removeItem(KEY);
  } else {
    localStorage.setItem(KEY, pref);
  }
  applyTheme();
  themeListeners.forEach((fn) => fn());
}

export function subscribeTheme(fn: () => void): () => void {
  themeListeners.add(fn);
  return () => {
    themeListeners.delete(fn);
  };
}

const THEME_ORDER: ThemePref[] = ["system", "light", "dark"];

export function cycleThemePref(): void {
  setThemePref(THEME_ORDER[(THEME_ORDER.indexOf(getThemePref()) + 1) % THEME_ORDER.length]);
}

function systemPrefersLight(): boolean {
  // jsdom has no matchMedia; the flagship dark theme is the fallback.
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  );
}

function applyTheme(): void {
  const pref = getThemePref();
  const resolved = pref === "system" ? (systemPrefersLight() ? "light" : "dark") : pref;
  document.documentElement.dataset.theme = resolved;
}

export function initTheme(): void {
  applyTheme();
  if (typeof window.matchMedia === "function") {
    window
      .matchMedia("(prefers-color-scheme: light)")
      .addEventListener("change", applyTheme);
  }
}

// Inspector visibility persists per browser session only (spec: "collapsed
// state persists per session"), hence sessionStorage rather than localStorage.
const INSPECTOR_KEY = "chunklens:inspector-open";

export function getInspectorOpen(): boolean {
  return sessionStorage.getItem(INSPECTOR_KEY) !== "0";
}

export function setInspectorOpen(open: boolean): void {
  if (open) {
    sessionStorage.removeItem(INSPECTOR_KEY);
  } else {
    sessionStorage.setItem(INSPECTOR_KEY, "0");
  }
}
