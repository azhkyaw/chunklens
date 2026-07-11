import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useShortcut } from "./shortcuts";

function Probe({
  spec,
  onFire,
  inInputs,
}: {
  spec: string;
  onFire: (e: KeyboardEvent) => void;
  inInputs?: boolean;
}) {
  useShortcut(spec, onFire, { inInputs });
  return <input aria-label="field" />;
}

test("a single-key binding fires on window keydown", () => {
  const fire = vi.fn();
  render(<Probe spec="j" onFire={fire} />);
  fireEvent.keyDown(window, { key: "j" });
  expect(fire).toHaveBeenCalledTimes(1);
});

test("single keys are suppressed while focus is in an input", () => {
  const fire = vi.fn();
  render(<Probe spec="j" onFire={fire} />);
  const field = screen.getByLabelText("field");
  field.focus();
  fireEvent.keyDown(field, { key: "j" });
  expect(fire).not.toHaveBeenCalled();
});

test("inInputs opts back into firing from an input", () => {
  const fire = vi.fn();
  render(<Probe spec="escape" onFire={fire} inInputs />);
  const field = screen.getByLabelText("field");
  field.focus();
  fireEvent.keyDown(field, { key: "Escape" });
  expect(fire).toHaveBeenCalledTimes(1);
});

test("single keys are suppressed while a dialog is open", () => {
  const fire = vi.fn();
  render(
    <>
      <Probe spec="j" onFire={fire} />
      <div role="dialog" aria-label="Something" />
    </>,
  );
  fireEvent.keyDown(window, { key: "j" });
  expect(fire).not.toHaveBeenCalled();
});

test("mod+k fires with ctrl even inside an input, and not without a modifier", () => {
  const fire = vi.fn();
  render(<Probe spec="mod+k" onFire={fire} />);
  fireEvent.keyDown(window, { key: "k" });
  expect(fire).not.toHaveBeenCalled();
  const field = screen.getByLabelText("field");
  field.focus();
  fireEvent.keyDown(field, { key: "k", ctrlKey: true });
  expect(fire).toHaveBeenCalledTimes(1);
});

test("alt combos never match a single-key binding", () => {
  const fire = vi.fn();
  render(<Probe spec="j" onFire={fire} />);
  fireEvent.keyDown(window, { key: "j", altKey: true });
  expect(fire).not.toHaveBeenCalled();
});

test("a two-key sequence fires only after both keys in order", () => {
  const fire = vi.fn();
  render(<Probe spec="g c" onFire={fire} />);
  fireEvent.keyDown(window, { key: "c" });
  expect(fire).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: "g" });
  fireEvent.keyDown(window, { key: "c" });
  expect(fire).toHaveBeenCalledTimes(1);
});

test("a mismatched second key resets the sequence", () => {
  const fire = vi.fn();
  render(<Probe spec="g c" onFire={fire} />);
  fireEvent.keyDown(window, { key: "g" });
  fireEvent.keyDown(window, { key: "x" });
  fireEvent.keyDown(window, { key: "c" });
  expect(fire).not.toHaveBeenCalled();
});

test("the listener is removed on unmount", () => {
  const fire = vi.fn();
  const { unmount } = render(<Probe spec="j" onFire={fire} />);
  unmount();
  fireEvent.keyDown(window, { key: "j" });
  expect(fire).not.toHaveBeenCalled();
});

test("single keys are suppressed while focus is in a bare contenteditable", () => {
  const fire = vi.fn();
  render(
    <>
      <Probe spec="j" onFire={fire} />
      <div tabIndex={0} aria-label="editable" />
    </>,
  );
  const editable = screen.getByLabelText("editable");
  editable.setAttribute("contenteditable", "");
  editable.focus();
  fireEvent.keyDown(editable, { key: "j" });
  expect(fire).not.toHaveBeenCalled();
});

test("single keys are suppressed while focus is in contenteditable=true", () => {
  const fire = vi.fn();
  render(
    <>
      <Probe spec="j" onFire={fire} />
      <div contentEditable="true" tabIndex={0} aria-label="editable-true" />
    </>,
  );
  const editable = screen.getByLabelText("editable-true");
  editable.focus();
  fireEvent.keyDown(editable, { key: "j" });
  expect(fire).not.toHaveBeenCalled();
});

test("single keys fire when contenteditable=false", () => {
  const fire = vi.fn();
  render(
    <>
      <Probe spec="j" onFire={fire} />
      <div contentEditable="false" tabIndex={0} aria-label="editable-false" />
    </>,
  );
  const notEditable = screen.getByLabelText("editable-false");
  notEditable.focus();
  fireEvent.keyDown(notEditable, { key: "j" });
  expect(fire).toHaveBeenCalledTimes(1);
});
