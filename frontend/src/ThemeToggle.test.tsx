import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { setThemePref } from "./lib/prefs";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("ThemeToggle", () => {
  it("starts on the system preference", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Theme: system" })).toBeInTheDocument();
  });

  it("cycles system to light to dark to system", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: "Theme: system" });

    await user.click(btn);
    expect(screen.getByRole("button", { name: "Theme: light" })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("chunklens:theme")).toBe("light");

    await user.click(btn);
    expect(screen.getByRole("button", { name: "Theme: dark" })).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(btn);
    expect(screen.getByRole("button", { name: "Theme: system" })).toBeInTheDocument();
    expect(localStorage.getItem("chunklens:theme")).toBeNull();
    // no matchMedia in jsdom: system resolves to the dark flagship
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("starts on a stored explicit preference", () => {
    localStorage.setItem("chunklens:theme", "dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Theme: dark" })).toBeInTheDocument();
  });

  it("the toggle reflects a theme change made elsewhere (palette)", async () => {
    render(<ThemeToggle />);
    act(() => setThemePref("dark"));
    expect(screen.getByRole("button", { name: /theme: dark/i })).toBeInTheDocument();
  });
});
