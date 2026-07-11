import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { EmptyState } from "./EmptyState";

test("renders title, hint, and action children", () => {
  render(
    <EmptyState title="no query yet" hint="type a query and press Run">
      <button type="button">Do it</button>
    </EmptyState>,
  );
  expect(screen.getByText("no query yet")).toHaveClass("empty-title");
  expect(screen.getByText("type a query and press Run")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Do it" })).toBeInTheDocument();
});

test("omits the hint and actions blocks when absent", () => {
  const { container } = render(<EmptyState title="idle" />);
  expect(container.querySelector(".empty-actions")).toBeNull();
  expect(container.querySelectorAll("p")).toHaveLength(1);
});
