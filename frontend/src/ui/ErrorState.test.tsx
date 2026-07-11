import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ErrorState } from "./ErrorState";

test("announces the error and retries on click", async () => {
  const onRetry = vi.fn();
  render(<ErrorState message="Failed to load records." onRetry={onRetry} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Failed to load records.");
  await userEvent.click(screen.getByRole("button", { name: /retry/i }));
  expect(onRetry).toHaveBeenCalledOnce();
});

test("renders without a retry button when no handler is given", () => {
  render(<ErrorState message="boom" />);
  expect(screen.queryByRole("button")).toBeNull();
});
