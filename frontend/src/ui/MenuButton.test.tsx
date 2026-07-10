import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { MenuButton } from "./MenuButton";

function makeItems(spy = vi.fn()) {
  return [
    { label: "New collection", onSelect: spy },
    { label: "Import collection", onSelect: vi.fn() },
  ];
}

test("opens on click and focuses the first item", async () => {
  render(<MenuButton label="Add collection" items={makeItems()} />);
  const trigger = screen.getByRole("button", { name: "Add collection" });
  expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("menuitem", { name: "New collection" })).toHaveFocus();
});

test("arrow keys cycle items; Escape closes and refocuses the trigger", async () => {
  render(<MenuButton label="Add collection" items={makeItems()} />);
  await userEvent.click(screen.getByRole("button", { name: "Add collection" }));
  await userEvent.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitem", { name: "Import collection" })).toHaveFocus();
  await userEvent.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitem", { name: "New collection" })).toHaveFocus();
  await userEvent.keyboard("{ArrowUp}");
  expect(screen.getByRole("menuitem", { name: "Import collection" })).toHaveFocus();
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add collection" })).toHaveFocus();
});

test("selecting an item calls onSelect and closes the menu", async () => {
  const spy = vi.fn();
  render(<MenuButton label="Add collection" items={makeItems(spy)} />);
  await userEvent.click(screen.getByRole("button", { name: "Add collection" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "New collection" }));
  expect(spy).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

test("clicking outside closes the menu", async () => {
  render(
    <div>
      <MenuButton label="Add collection" items={makeItems()} />
      <button>Elsewhere</button>
    </div>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Add collection" }));
  expect(screen.getByRole("menu")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});
