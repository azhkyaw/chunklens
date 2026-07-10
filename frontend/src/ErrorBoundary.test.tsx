import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

afterEach(() => vi.restoreAllMocks());

function Boom(): never {
  throw new Error("boom");
}

test("renders a fallback instead of unmounting the app when a child throws", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(/something went wrong/i);
});

test("renders children when nothing throws", () => {
  render(
    <ErrorBoundary>
      <p>fine</p>
    </ErrorBoundary>,
  );
  expect(screen.getByText("fine")).toBeInTheDocument();
});
