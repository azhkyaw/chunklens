import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { InspectorShell } from "./InspectorShell";

test("open shell shows the Inspector header, children, and a close button", async () => {
  const onToggle = vi.fn();
  render(
    <InspectorShell open onToggle={onToggle}>
      <p>detail body</p>
    </InspectorShell>,
  );
  const pane = screen.getByRole("complementary", { name: /inspector/i });
  expect(pane).toBeInTheDocument();
  expect(screen.getByText("detail body")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /close inspector/i }));
  expect(onToggle).toHaveBeenCalledTimes(1);
});

test("collapsed shell hides children and shows a reopen strip", async () => {
  const onToggle = vi.fn();
  render(
    <InspectorShell open={false} onToggle={onToggle}>
      <p>detail body</p>
    </InspectorShell>,
  );
  expect(screen.queryByText("detail body")).not.toBeInTheDocument();
  // A collapsed inspector must expose NO complementary landmark at all,
  // not merely one that lacks the "Inspector" name.
  expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  const reopen = screen.getByRole("button", { name: /open inspector/i });
  expect(reopen).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(reopen);
  expect(onToggle).toHaveBeenCalledTimes(1);
});

test("the open pane accepts a paneRef and is programmatically focusable", () => {
  const ref = createRef<HTMLElement>();
  render(
    <InspectorShell open onToggle={() => {}} paneRef={ref}>
      <p>body</p>
    </InspectorShell>,
  );
  expect(ref.current).not.toBeNull();
  ref.current!.focus();
  expect(ref.current).toHaveFocus();
});
