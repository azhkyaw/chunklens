import { render, screen, within } from "@testing-library/react";
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
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent(/something went wrong/i);
  // The crash screen carries the app's own furniture (branded eyebrow) and the
  // one recovery affordance a boundary can honestly offer: a full reload.
  expect(alert).toHaveClass("error-boundary");
  expect(within(alert).getByText("ChunkLens")).toHaveClass("eyebrow");
  expect(alert).toHaveTextContent("boom");
  expect(within(alert).getByRole("button", { name: /reload/i })).toBeInTheDocument();
});

test("renders children when nothing throws", () => {
  render(
    <ErrorBoundary>
      <p>fine</p>
    </ErrorBoundary>,
  );
  expect(screen.getByText("fine")).toBeInTheDocument();
});
