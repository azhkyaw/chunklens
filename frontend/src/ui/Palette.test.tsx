import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { expect, test, vi } from "vitest";
import { Palette, type PaletteCommand } from "./Palette";

function commands(overrides: Partial<PaletteCommand> = {}): PaletteCommand[] {
  return [
    { group: "Collections", label: "demo", run: vi.fn(), ...overrides },
    { group: "Collections", label: "papers", run: vi.fn() },
    { group: "Actions", label: "New collection", keywords: ["create"], run: vi.fn() },
  ];
}

// Mounts the Palette the way the real app does: opened from a keyboard
// shortcut while some other control (here, this button) has focus. Modal
// captures that opener as its restore target, so this is what makes the
// StrictMode double-invoke bug reproduce (rendering <Palette> with nothing
// previously focused leaves the restore target as document.body, which
// isn't natively focusable and so never actually moves focus back).
function Host() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open palette</button>
      {open && <Palette commands={commands()} onClose={() => setOpen(false)} />}
    </>
  );
}

test("renders a dialog with an autofocused input and grouped commands", () => {
  render(<Palette commands={commands()} onClose={() => {}} />);
  expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();
  // Modal owns initial focus via its initialFocus prop (see Modal.tsx and
  // Palette.tsx, which points it at the Command.Input ref) rather than the
  // input's own native autoFocus, so the focus target is stable across
  // StrictMode's double-invoked mount effects.
  expect(screen.getByPlaceholderText(/type a command/i)).toHaveFocus();
  expect(screen.getByText("Collections")).toBeInTheDocument();
  expect(screen.getByText("Actions")).toBeInTheDocument();
  expect(screen.getByText("demo")).toBeInTheDocument();
});

test("under StrictMode (the real app's configuration), the input is still focused on open", async () => {
  render(
    <React.StrictMode>
      <Host />
    </React.StrictMode>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Open palette" }));
  expect(screen.getByPlaceholderText(/type a command/i)).toHaveFocus();
});

test("typing filters the list, including by keyword", async () => {
  render(<Palette commands={commands()} onClose={() => {}} />);
  await userEvent.keyboard("create");
  expect(screen.getByText("New collection")).toBeInTheDocument();
  expect(screen.queryByText("papers")).not.toBeInTheDocument();
});

test("shows the empty state when nothing matches", async () => {
  render(<Palette commands={commands()} onClose={() => {}} />);
  await userEvent.keyboard("zzzz");
  expect(screen.getByText(/no matching commands/i)).toBeInTheDocument();
});

test("selecting an item closes the palette then runs the command", async () => {
  const calls: string[] = [];
  const cmds = commands();
  cmds[0].run = () => calls.push("run");
  const onClose = () => calls.push("close");
  render(<Palette commands={cmds} onClose={onClose} />);
  await userEvent.click(screen.getByText("demo"));
  expect(calls).toEqual(["close", "run"]);
});

test("Enter runs the highlighted command", async () => {
  const run = vi.fn();
  const cmds = commands({ run });
  render(<Palette commands={cmds} onClose={() => {}} />);
  await userEvent.keyboard("demo{Enter}");
  expect(run).toHaveBeenCalled();
});

// Regression for the palette running the WRONG command: cmdk's default filter
// does fuzzy SUBSEQUENCE matching over value+keywords, so typing "demo" could
// also match "Toggle density" (d,e from "density", m,o from "comfortable")
// and the two would race for the auto-selected (and Enter-activated) item.
test("typing a collection name matches only that collection, not an unrelated command with overlapping letters", async () => {
  const cmds: PaletteCommand[] = [
    { group: "Collections", label: "demo", run: vi.fn() },
    { group: "Actions", label: "Toggle density", keywords: ["compact", "comfortable", "rows"], run: vi.fn() },
  ];
  render(<Palette commands={cmds} onClose={() => {}} />);
  await userEvent.keyboard("demo");
  expect(screen.getByText("demo")).toBeInTheDocument();
  expect(screen.queryByText("Toggle density")).not.toBeInTheDocument();
});

test("keyword search finds a command whose label does not contain the search text", async () => {
  const cmds: PaletteCommand[] = [
    { group: "Collections", label: "demo", run: vi.fn() },
    { group: "Actions", label: "Manage collection", keywords: ["rename", "delete"], run: vi.fn() },
  ];
  render(<Palette commands={cmds} onClose={() => {}} />);
  await userEvent.keyboard("rename");
  expect(screen.getByText("Manage collection")).toBeInTheDocument();
  expect(screen.queryByText("demo")).not.toBeInTheDocument();
});
