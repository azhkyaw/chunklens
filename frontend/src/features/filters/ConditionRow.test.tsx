import { fireEvent, render, screen, within } from "@testing-library/react";
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

test("switching to a comparison operator reaches the num type even when the sample locked the key", async () => {
  // The sample is 200 records deep and reports only what it saw: a PDF extractor
  // that stores page numbers as strings makes "page" look like a str key. The
  // user asking for page > 5 knows better, and serialization requires a number
  // there, so the row must follow the operator rather than the sample.
  const onChange = vi.fn();
  const node = { ...newMetaCondition(), field: "page", valueType: "string" as const, value: "5" };
  render(<ConditionRow node={node} keys={[{ key: "page", types: ["str"] }]} onChange={onChange} onRemove={() => {}} />);
  await userEvent.selectOptions(screen.getByLabelText("operator"), "$gt");
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ operator: "$gt", valueType: "number" }));
});

test("a comparison row keeps the value type select even when the sample locked the key", () => {
  // Without it the row is a dead end: validation demands the num type, the row
  // has no way to reach it, and one such row disables Run for the whole query.
  const node = { ...newMetaCondition(), field: "page", operator: "$gt" as const, valueType: "number" as const, value: 5 };
  render(<ConditionRow node={node} keys={[{ key: "page", types: ["str"] }]} onChange={() => {}} onRemove={() => {}} />);
  expect(screen.getByLabelText(/value type/i)).toBeInTheDocument();
});

test("a locked key on a non-comparison operator still hides the value type select", () => {
  const node = { ...newMetaCondition(), field: "page", valueType: "string" as const, value: "5" };
  render(<ConditionRow node={node} keys={[{ key: "page", types: ["str"] }]} onChange={() => {}} onRemove={() => {}} />);
  expect(screen.queryByLabelText(/value type/i)).not.toBeInTheDocument();
});

test("picking a locked key while on a comparison operator keeps the num type", () => {
  const onChange = vi.fn();
  const node = { ...newMetaCondition(), operator: "$gt" as const, valueType: "number" as const, value: 5 };
  render(<ConditionRow node={node} keys={[{ key: "page", types: ["str"] }]} onChange={onChange} onRemove={() => {}} />);
  // one change event, not keystrokes: the field is controlled by `node`, which
  // this test holds still, so typing would never build up the whole key name
  fireEvent.change(screen.getByLabelText("field"), { target: { value: "page" } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ field: "page", valueType: "number" }));
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
