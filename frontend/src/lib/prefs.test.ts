import { afterEach, describe, expect, it, test, vi } from "vitest";
import { getInspectorOpen, getThemePref, initTheme, setInspectorOpen, setThemePref } from "./prefs";

type Listener = (e: { matches: boolean }) => void;

function stubMatchMedia(prefersLight: boolean) {
  const listeners: Listener[] = [];
  const mql = {
    matches: prefersLight,
    addEventListener: (_: string, fn: Listener) => listeners.push(fn),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql));
  return {
    fireChange(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((fn) => fn({ matches }));
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("getThemePref", () => {
  it("defaults to system when nothing is stored", () => {
    expect(getThemePref()).toBe("system");
  });

  it("returns a stored explicit preference", () => {
    localStorage.setItem("chunklens:theme", "light");
    expect(getThemePref()).toBe("light");
  });

  it("ignores garbage in storage", () => {
    localStorage.setItem("chunklens:theme", "banana");
    expect(getThemePref()).toBe("system");
  });
});

describe("setThemePref", () => {
  it("persists an explicit preference and stamps data-theme", () => {
    setThemePref("light");
    expect(localStorage.getItem("chunklens:theme")).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("system clears storage and follows the OS", () => {
    stubMatchMedia(true); // OS prefers light
    setThemePref("system");
    expect(localStorage.getItem("chunklens:theme")).toBeNull();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("falls back to dark in system mode when matchMedia is unavailable", () => {
    // jsdom default: no matchMedia. Dark is the flagship fallback.
    setThemePref("system");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

describe("initTheme", () => {
  it("applies the resolved theme on startup", () => {
    stubMatchMedia(false); // OS prefers dark
    initTheme();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("follows OS changes while in system mode", () => {
    const media = stubMatchMedia(false);
    initTheme();
    expect(document.documentElement.dataset.theme).toBe("dark");
    media.fireChange(true);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("does not follow OS changes when an explicit preference is set", () => {
    const media = stubMatchMedia(false);
    initTheme();
    setThemePref("dark");
    media.fireChange(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

test("inspector open defaults to true and persists a close for the session", () => {
  sessionStorage.clear();
  expect(getInspectorOpen()).toBe(true);
  setInspectorOpen(false);
  expect(getInspectorOpen()).toBe(false);
  expect(sessionStorage.getItem("chunklens:inspector-open")).toBe("0");
  setInspectorOpen(true);
  expect(getInspectorOpen()).toBe(true);
  expect(sessionStorage.getItem("chunklens:inspector-open")).toBeNull();
});
