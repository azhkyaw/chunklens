// frontend/src/ui/toast.test.tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { AppToaster, toastError, toastSuccess } from "./toast";

test("toastSuccess renders a message into the toaster region", async () => {
  render(<AppToaster />);
  toastSuccess("Saved the thing");
  expect(await screen.findByText("Saved the thing")).toBeInTheDocument();
});

test("toastError renders an error message", async () => {
  render(<AppToaster />);
  toastError("It broke");
  expect(await screen.findByText("It broke")).toBeInTheDocument();
});
