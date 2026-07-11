import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { Palette, type PaletteCommand } from "./Palette";

function commands(overrides: Partial<PaletteCommand> = {}): PaletteCommand[] {
  return [
    { group: "Collections", label: "demo", run: vi.fn(), ...overrides },
    { group: "Collections", label: "papers", run: vi.fn() },
    { group: "Actions", label: "New collection", keywords: ["create"], run: vi.fn() },
  ];
}

test("renders a dialog with an autofocused input and grouped commands", () => {
  render(<Palette commands={commands()} onClose={() => {}} />);
  expect(screen.getByRole("dialog", { name: /command palette/i })).toBeInTheDocument();
  // The input's native autoFocus claims focus in the layout phase; Modal's
  // own mount effect (passive, later) sees focus already inside the dialog
  // and does not steal it back (see Modal.tsx).
  expect(screen.getByPlaceholderText(/type a command/i)).toHaveFocus();
  expect(screen.getByText("Collections")).toBeInTheDocument();
  expect(screen.getByText("Actions")).toBeInTheDocument();
  expect(screen.getByText("demo")).toBeInTheDocument();
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
