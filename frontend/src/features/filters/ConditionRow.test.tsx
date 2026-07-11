import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ConditionRow } from "./ConditionRow";
import { newMetaCondition, newDocCondition } from "./filterModel";

test("switching operator to $in emits an array value", async () => {
  const onChange = vi.fn();
  render(<ConditionRow node={{ ...newMetaCondition(), field: "tag" }} keys={[]} onChange={onChange} onRemove={() => {}} />);
  await userEvent.selectOptions(screen.getByLabelText(/operator/i), "$in");
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: "$in", value: [] }));
});

test("a bool-typed field renders a true/false value select", () => {
  const node = { ...newMetaCondition(), field: "ok", valueType: "boolean" as const, value: true };
  render(<ConditionRow node={node} keys={[{ key: "ok", types: ["bool"] }]} onChange={() => {}} onRemove={() => {}} />);
  const value = screen.getByLabelText(/^value$/i) as HTMLSelectElement;
  expect(value.tagName).toBe("SELECT");
  expect(within(value).getByRole("option", { name: "true" })).toBeInTheDocument();
});

test("document leaf shows operator + text", async () => {
  const onChange = vi.fn();
  render(<ConditionRow node={newDocCondition()} keys={[]} onChange={onChange} onRemove={() => {}} />);
  await userEvent.type(screen.getByLabelText(/^text$/i), "fox");
  expect(onChange).toHaveBeenCalled();
});

test("switching to a comparison operator on an untyped key auto-selects the num type", async () => {
  const onChange = vi.fn();
  render(<ConditionRow node={{ ...newMetaCondition(), field: "page" }} keys={[]} onChange={onChange} onRemove={() => {}} />);
  await userEvent.selectOptions(screen.getByLabelText("operator"), "$gt");
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: "$gt", valueType: "number" }));
});

test("switching to a comparison operator on a key the sample locks to a type does not fight it", async () => {
  const onChange = vi.fn();
  const node = { ...newMetaCondition(), field: "ok", valueType: "boolean" as const, value: true };
  render(<ConditionRow node={node} keys={[{ key: "ok", types: ["bool"] }]} onChange={onChange} onRemove={() => {}} />);
  await userEvent.selectOptions(screen.getByLabelText("operator"), "$gt");
  expect(onChange).toHaveBeenCalledWith({ operator: "$gt" });
});

test("each row gets its own datalist id", () => {
  const { container } = render(
    <>
      <ConditionRow node={{ ...newMetaCondition() }} keys={[]} onChange={() => {}} onRemove={() => {}} />
      <ConditionRow node={{ ...newMetaCondition() }} keys={[]} onChange={() => {}} onRemove={() => {}} />
    </>,
  );
  const lists = container.querySelectorAll("datalist");
  expect(lists).toHaveLength(2);
  expect(lists[0].id).not.toBe(lists[1].id);
});
