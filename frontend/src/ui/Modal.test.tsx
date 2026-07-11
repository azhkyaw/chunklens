import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useRef, useState } from "react";
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

function AutofocusChildHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app">
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Modal label="Test dialog" onClose={() => setOpen(false)}>
          <input placeholder="Autofocus input" autoFocus />
        </Modal>
      )}
    </div>
  );
}

test("without an initialFocus prop, the dialog takes focus even over a child's native autoFocus, and closing still restores the opener", async () => {
  render(<AutofocusChildHarness />);
  const opener = screen.getByRole("button", { name: "Open" });
  await userEvent.click(opener);

  // Modal is the single owner of initial focus. A content control's own
  // native autoFocus is no longer respected on its own - a caller that wants
  // a child focused instead of the dialog must opt in via the initialFocus
  // prop (see the InitialFocusHarness tests below). Letting two uncoordinated
  // mechanisms race for focus is exactly what broke under StrictMode, so the
  // dialog winning here is intentional, not a regression.
  expect(screen.getByRole("dialog")).toHaveFocus();

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

  // The restore target is still captured during render (before any commit
  // can move focus), so closing returns focus to the real opener.
  await waitFor(() => expect(opener).toHaveFocus());
});

function InitialFocusHarness() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="app">
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <Modal label="Test dialog" onClose={() => setOpen(false)} initialFocus={inputRef}>
          <input ref={inputRef} placeholder="Search" />
        </Modal>
      )}
    </div>
  );
}

test("an explicit initialFocus target is focused on open, and the opener gets focus back on close", async () => {
  render(<InitialFocusHarness />);
  const opener = screen.getByRole("button", { name: "Open" });
  await userEvent.click(opener);

  const input = screen.getByPlaceholderText("Search");
  expect(input).toHaveFocus();

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(opener).toHaveFocus());
});

test("under StrictMode's double-invoked effects, initialFocus still wins and close still restores the opener", async () => {
  // StrictMode runs mount -> simulated cleanup -> mount again in dev. A mount
  // effect that only CONDITIONALLY takes focus (the old `if (!contains(...))
  // ref.current.focus()` guard) sees focus already moved back to the opener by
  // the simulated cleanup's restore, and steals it onto the dialog on the
  // second setup. This test fails against that code: the dialog ends up
  // focused instead of the initialFocus input.
  render(
    <React.StrictMode>
      <InitialFocusHarness />
    </React.StrictMode>,
  );
  const opener = screen.getByRole("button", { name: "Open" });
  await userEvent.click(opener);

  const input = screen.getByPlaceholderText("Search");
  expect(input).toHaveFocus();

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(opener).toHaveFocus());
});

test("with no initialFocus, StrictMode still leaves the dialog focused on open and restores the opener on close", async () => {
  // Regression guard: the fix must not change behavior for the many existing
  // callers (connection settings, new collection, import, manage collection)
  // that pass no initialFocus at all.
  render(
    <React.StrictMode>
      <FocusRestoreHarness />
    </React.StrictMode>,
  );
  const opener = screen.getByRole("button", { name: "Open" });
  await userEvent.click(opener);
  expect(screen.getByRole("dialog")).toHaveFocus();

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  await waitFor(() => expect(opener).toHaveFocus());
});

function DetachedRestoreHarness() {
  const [showOpener, setShowOpener] = useState(true);
  const [open, setOpen] = useState(false);
  return (
    <div className="app">
      <button className="palette-hint">palette hint</button>
      {showOpener && <button onClick={() => setOpen(true)}>Open</button>}
      {open && (
        <Modal label="Test dialog" onClose={() => setOpen(false)}>
          <button onClick={() => setShowOpener(false)}>Detach opener</button>
        </Modal>
      )}
    </div>
  );
}

test("falls back to a live anchor when the restore target is removed from the DOM while open", async () => {
  // Reproduces the palette -> modal-opening-command chain: the restore
  // target (here, the Open button; in the app, the palette's opener) can be
  // unmounted while the modal it opened is still up. Calling .focus() on a
  // detached node is a silent no-op, so without a fallback focus falls to
  // <body>.
  render(<DetachedRestoreHarness />);
  const opener = screen.getByRole("button", { name: "Open" });
  await userEvent.click(opener);
  screen.getByRole("dialog");

  await userEvent.click(screen.getByRole("button", { name: "Detach opener" }));
  expect(screen.queryByRole("button", { name: "Open" })).not.toBeInTheDocument();

  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

  await waitFor(() => expect(document.querySelector(".palette-hint")).toHaveFocus());
  expect(document.activeElement).not.toBe(document.body);
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
