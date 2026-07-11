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

// Regression for the palette BOOT RACE: the Collections commands come from the
// useCollections() query, so a palette opened before it resolves has nothing but
// the ACTION commands to rank - typing a collection name would auto-select (and
// Enter would RUN) some unrelated action. While loading, selection is suppressed
// entirely: neither Enter nor a click may fire a command, and the palette must
// stay OPEN (closing without running anything is a quieter version of the same
// bug - the user's keystroke would vanish).
test("while collections load, selection is suppressed and a loading row shows", async () => {
  const run = vi.fn();
  const onClose = vi.fn();
  render(
    <Palette
      loading
      onClose={onClose}
      commands={[{ group: "Actions", label: "Toggle theme", run }]}
    />,
  );
  expect(screen.getByText(/loading collections/i)).toBeInTheDocument();
  // cmdk hides the loading row's text node from the accessibility tree and
  // exposes role="progressbar" instead - its accessible name comes from the
  // label prop, not the visible text, so pin that separately.
  expect(screen.getByRole("progressbar", { name: /loading collections/i })).toBeInTheDocument();
  await userEvent.keyboard("theme");
  await userEvent.keyboard("{Enter}");
  expect(run).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test("while collections load, clicking an item runs nothing either", async () => {
  const run = vi.fn();
  const onClose = vi.fn();
  render(
    <Palette
      loading
      onClose={onClose}
      commands={[{ group: "Actions", label: "Toggle theme", run }]}
    />,
  );
  await userEvent.click(screen.getByText("Toggle theme"));
  expect(run).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
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

// Regression for a ranking that is not total: the old filter scored matches
// by position only (1000 - idx), so an exact label and a longer label that
// merely contains it both scored 1000 and tied. Ties fell back to cmdk's
// stable sort over DOM order, i.e. whatever order the commands array was
// built in - so typing a collection's FULL EXACT NAME and pressing Enter
// could open a DIFFERENT collection. An exact (case-insensitive) label match
// must now win outright over any other match.
test("an exact label match outranks a longer label that merely contains it", async () => {
  const cmds: PaletteCommand[] = [
    { group: "Collections", label: "docs", run: vi.fn() },
    { group: "Collections", label: "docs-archive", run: vi.fn() },
  ];
  render(<Palette commands={cmds} onClose={() => {}} />);
  await userEvent.keyboard("docs");
  expect(screen.getByText("docs")).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("docs-archive")).toHaveAttribute("aria-selected", "false");
});

// Same failure mode with a collection name that collides with an action's
// label rather than another collection's label.
test("an exact collection name outranks an action whose label merely contains it", async () => {
  const cmds: PaletteCommand[] = [
    { group: "Collections", label: "connection", run: vi.fn() },
    { group: "Actions", label: "Connection settings", run: vi.fn() },
  ];
  render(<Palette commands={cmds} onClose={() => {}} />);
  await userEvent.keyboard("connection");
  expect(screen.getByText("connection")).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("Connection settings")).toHaveAttribute("aria-selected", "false");
});

// Proves the ranking is total (score-based) rather than accidentally correct
// because of DOM/array order: the exact match must win no matter which item
// was registered - and therefore rendered - first.
test("the exact match wins regardless of which item was registered first", async () => {
  const exact: PaletteCommand = { group: "Collections", label: "docs", run: vi.fn() };
  const longer: PaletteCommand = { group: "Collections", label: "docs-archive", run: vi.fn() };

  const { unmount } = render(<Palette commands={[exact, longer]} onClose={() => {}} />);
  await userEvent.keyboard("docs");
  expect(screen.getByText("docs")).toHaveAttribute("aria-selected", "true");
  unmount();

  render(<Palette commands={[longer, exact]} onClose={() => {}} />);
  await userEvent.keyboard("docs");
  expect(screen.getByText("docs")).toHaveAttribute("aria-selected", "true");
});

// Regression for the ranking not being lexicographic: the old filter SUMMED
// the index term and the length term (`2000 - idx + (1000 - len)`), so a
// later-index (infix) match on a short label could outscore an earlier-index
// (prefix) match on a longer label - e.g. searching "doc" scored
// "documentation-index" (idx 0, len 19) at 2981 but "my-doc" (idx 3, len 6)
// at 2991, so the infix match wrongly won. Index must dominate length: a
// prefix match must outrank an infix match regardless of either label's
// length. Registered in both orders since cmdk breaks true ties by DOM order,
// so a single fixed order could pass for the wrong reason.
test("a prefix match outranks an infix match on a shorter label", async () => {
  const prefix: PaletteCommand = { group: "Collections", label: "documentation-index", run: vi.fn() };
  const infix: PaletteCommand = { group: "Collections", label: "my-doc", run: vi.fn() };

  const { unmount } = render(<Palette commands={[prefix, infix]} onClose={() => {}} />);
  await userEvent.keyboard("doc");
  expect(screen.getByText("documentation-index")).toHaveAttribute("aria-selected", "true");
  unmount();

  render(<Palette commands={[infix, prefix]} onClose={() => {}} />);
  await userEvent.keyboard("doc");
  expect(screen.getByText("documentation-index")).toHaveAttribute("aria-selected", "true");
});
