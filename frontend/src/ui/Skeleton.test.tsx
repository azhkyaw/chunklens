import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Skeleton } from "./Skeleton";

test("renders an accessible loading status with the requested rows", () => {
  render(<Skeleton label="Loading records" rows={4} className="skeleton-table" />);
  const status = screen.getByRole("status", { name: "Loading records" });
  expect(status).toHaveClass("skeleton", "skeleton-table");
  expect(status.querySelectorAll(".skeleton-row")).toHaveLength(4);
  // bars are decoration; the status label carries the meaning
  status.querySelectorAll(".skeleton-row").forEach((el) => {
    expect(el).toHaveAttribute("aria-hidden", "true");
  });
});

test("defaults to three rows", () => {
  render(<Skeleton label="Loading" />);
  expect(screen.getByRole("status").querySelectorAll(".skeleton-row")).toHaveLength(3);
});
