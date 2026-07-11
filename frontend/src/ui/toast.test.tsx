// frontend/src/ui/toast.test.tsx
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { AppToaster, toastError, toastInfo, toastSuccess } from "./toast";

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

test("toastInfo renders a plain message into the toaster region", async () => {
  render(<AppToaster />);
  toastInfo("Copied the thing");
  expect(await screen.findByText("Copied the thing")).toBeInTheDocument();
});
