import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { QueryContextStrip } from "./QueryContextStrip";
import { GuardBanner } from "./GuardBanner";

test("context strip shows EF, dim and metric", () => {
  render(<QueryContextStrip details={{ name: "c", count: 0, dimensionality: 384, distance_metric: "cosine", embedding_function: "none", metadata: {} }} />);
  expect(screen.getByText(/none/)).toBeInTheDocument();
  expect(screen.getByText(/384/)).toBeInTheDocument();
  expect(screen.getByText(/cosine/)).toBeInTheDocument();
});

test("guard banner renders a block-level alert", () => {
  render(<GuardBanner guards={[{ level: "block", message: "no embedding function" }]} />);
  const alert = screen.getByRole("alert");
  expect(alert).toHaveAttribute("data-level", "block");
  expect(alert).toHaveTextContent(/no embedding function/);
});

test("guard banner renders nothing when empty", () => {
  const { container } = render(<GuardBanner guards={[]} />);
  expect(container).toBeEmptyDOMElement();
});
