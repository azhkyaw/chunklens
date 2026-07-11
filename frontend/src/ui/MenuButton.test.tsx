import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { useState } from "react";
import { MenuButton } from "./MenuButton";
import { Modal } from "./Modal";

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

function MenuModalHarness() {
  const [show, setShow] = useState(false);
  return (
    <div className="app">
      <MenuButton
        label="Add collection"
        items={[{ label: "New collection", onSelect: () => setShow(true) }]}
      />
      {show && (
        <Modal label="New collection" onClose={() => setShow(false)}>
          <p>form</p>
        </Modal>
      )}
    </div>
  );
}

test("focus returns to the trigger after a menu-launched modal closes", async () => {
  render(<MenuModalHarness />);
  const trigger = screen.getByRole("button", { name: /add collection/i });
  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole("menuitem", { name: /new collection/i }));
  const dialog = await screen.findByRole("dialog", { name: /new collection/i });
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(trigger).toHaveFocus());
});

test("Tab closes the menu and returns focus to the trigger", async () => {
  render(
    <MenuButton label="Add collection" items={[{ label: "New collection", onSelect: () => {} }]} />,
  );
  const trigger = screen.getByRole("button", { name: /add collection/i });
  await userEvent.click(trigger);
  const item = screen.getByRole("menuitem", { name: /new collection/i });
  fireEvent.keyDown(item, { key: "Tab" });
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
