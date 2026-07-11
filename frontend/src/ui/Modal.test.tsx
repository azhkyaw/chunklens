import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { Modal } from "./Modal";

test("renders a labeled modal dialog and takes focus", () => {
  render(
    <Modal label="Test dialog" onClose={() => {}}>
      <button>Inside</button>
    </Modal>,
  );
  const dialog = screen.getByRole("dialog", { name: "Test dialog" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog).toHaveFocus();
});

test("Escape closes the dialog", async () => {
  const onClose = vi.fn();
  render(
    <Modal label="Test dialog" onClose={onClose}>
      <button>Inside</button>
    </Modal>,
  );
  await userEvent.keyboard("{Escape}");
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("clicking the overlay closes, clicking inside does not", async () => {
  const onClose = vi.fn();
  render(
    <Modal label="Test dialog" onClose={onClose}>
      <button>Inside</button>
    </Modal>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Inside" }));
  expect(onClose).not.toHaveBeenCalled();
  await userEvent.click(document.querySelector(".modal-overlay")!);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("Tab wraps focus within the dialog in both directions", async () => {
  render(
    <Modal label="Test dialog" onClose={() => {}}>
      <button>First</button>
      <button>Last</button>
    </Modal>,
  );
  await userEvent.tab(); // dialog -> First
  expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  await userEvent.tab(); // -> Last
  expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
  await userEvent.tab(); // wraps -> First
  expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  await userEvent.tab({ shift: true }); // wraps back -> Last
  expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
});

test("restores focus to the previously focused element on close", async () => {
  function Host() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open</button>
        {open && (
          <Modal label="Test dialog" onClose={() => setOpen(false)}>
            <button onClick={() => setOpen(false)}>Close</button>
          </Modal>
        )}
      </>
    );
  }
  render(<Host />);
  const opener = screen.getByRole("button", { name: "Open" });
  await userEvent.click(opener);
  await userEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(opener).toHaveFocus();
});

function InertHarness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="app">
        <button>background</button>
      </div>
      {open && (
        <Modal label="Thing" onClose={() => setOpen(false)}>
          <p>content</p>
        </Modal>
      )}
    </>
  );
}

test("the app shell is inert while a modal is open and restored on close", async () => {
  render(<InertHarness />);
  const app = document.querySelector(".app")!;
  expect(app).toHaveAttribute("inert");
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(app).not.toHaveAttribute("inert"));
});

test("the dialog renders outside the app shell (portal)", () => {
  render(<InertHarness />);
  const app = document.querySelector(".app")!;
  expect(app.contains(screen.getByRole("dialog"))).toBe(false);
});
