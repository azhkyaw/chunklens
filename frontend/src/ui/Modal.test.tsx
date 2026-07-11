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
    <div className="app">
      <button>background</button>
      {open && (
        <Modal label="Thing" onClose={() => setOpen(false)}>
          <p>content</p>
        </Modal>
      )}
    </div>
  );
}

test("the app shell is inert while a modal is open and restored on close", async () => {
  render(<InertHarness />);
  const app = document.querySelector(".app")!;
  expect(app).toHaveAttribute("inert");
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(app).not.toHaveAttribute("inert"));
});

test("the dialog renders outside the app shell (portal)", async () => {
  render(<InertHarness />);
  const app = document.querySelector(".app")!;
  expect(app.contains(screen.getByRole("dialog"))).toBe(false);
  // Close explicitly so the module-level inert counter doesn't leak into
  // later tests in this file (this Modal is otherwise left mounted).
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(app).not.toHaveAttribute("inert"));
});

function FocusRestoreHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app">
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Modal label="Test dialog" onClose={() => setOpen(false)}>
          <p>content</p>
        </Modal>
      )}
    </div>
  );
}

test("cleanup un-inerts the shell before restoring focus to the opener", async () => {
  render(<FocusRestoreHarness />);
  const opener = screen.getByRole("button", { name: "Open" });
  await userEvent.click(opener);
  screen.getByRole("dialog");

  // Spy AFTER the modal has already mounted (and already taken focus once
  // via the click), so the only recorded call is the cleanup's restore.
  const inertWhenFocused: boolean[] = [];
  vi.spyOn(opener, "focus").mockImplementation(() => {
    inertWhenFocused.push(document.querySelector(".app")?.hasAttribute("inert") ?? true);
    HTMLElement.prototype.focus.call(opener);
  });

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

  await waitFor(() => expect(inertWhenFocused).toHaveLength(1));
  // The shell must already be un-inert at the moment focus is restored -
  // otherwise a real browser would silently ignore the .focus() call.
  expect(inertWhenFocused[0]).toBe(false);
  expect(document.querySelector(".app")).not.toHaveAttribute("inert");
});

function StackedHarness() {
  const [outerOpen, setOuterOpen] = useState(true);
  const [innerOpen, setInnerOpen] = useState(true);
  return (
    <div className="app">
      <button>background</button>
      {outerOpen && (
        <Modal label="Outer" onClose={() => setOuterOpen(false)}>
          <p>outer content</p>
          {innerOpen && (
            <Modal label="Inner" onClose={() => setInnerOpen(false)}>
              <p>inner content</p>
            </Modal>
          )}
        </Modal>
      )}
    </div>
  );
}

test("shell stays inert until the last of two stacked modals closes", async () => {
  render(<StackedHarness />);
  const app = document.querySelector(".app")!;
  expect(app).toHaveAttribute("inert");

  fireEvent.keyDown(screen.getByRole("dialog", { name: "Inner" }), { key: "Escape" });
  await waitFor(() =>
    expect(screen.queryByRole("dialog", { name: "Inner" })).not.toBeInTheDocument(),
  );
  // A naive boolean (removeAttribute on any close) would fail this: the
  // outer modal is still open, so the shell must remain inert.
  expect(app).toHaveAttribute("inert");

  fireEvent.keyDown(screen.getByRole("dialog", { name: "Outer" }), { key: "Escape" });
  await waitFor(() => expect(app).not.toHaveAttribute("inert"));
});

test("the inert counter stays balanced when the shell unmounts with a modal still open", async () => {
  // Reproduces a full-tree unmount while a modal is still open (e.g. RTL's
  // afterEach on a test that forgot to close its modal, a parent remount,
  // or an HMR teardown). React removes .app in the mutation phase before
  // the modal's effect cleanup runs in the passive phase, so the shell is
  // already gone by the time setShellInert(false) looks for it.
  const leaked = render(<InertHarness />);
  expect(document.querySelector(".app")).toHaveAttribute("inert");
  leaked.unmount();

  // A fresh shell + modal, opened and closed normally, must end up
  // un-inert. If the previous unmount skipped its decrement, this one's
  // close only brings the count down to 1 and the shell stays stuck.
  render(<InertHarness />);
  const app = document.querySelector(".app")!;
  expect(app).toHaveAttribute("inert");
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(app).not.toHaveAttribute("inert"));
});
