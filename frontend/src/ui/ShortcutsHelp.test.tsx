import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { ShortcutsHelp } from "./ShortcutsHelp";

test("lists the keyboard model in a labeled dialog", () => {
  render(<ShortcutsHelp onClose={() => {}} />);
  expect(screen.getByRole("dialog", { name: /keyboard shortcuts/i })).toBeInTheDocument();
  expect(screen.getByText(/command palette/i)).toBeInTheDocument();
  expect(screen.getByText(/next row or hit/i)).toBeInTheDocument();
  expect(screen.getByText(/toggle the inspector/i)).toBeInTheDocument();
  expect(screen.getByText(/focus the collections rail/i)).toBeInTheDocument();
});
