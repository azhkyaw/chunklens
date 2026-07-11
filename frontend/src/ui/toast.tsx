import { Toaster, toast } from "sonner";

/**
 * The single notification chokepoint: features import these helpers, never
 * sonner directly, so restyling or swapping the library is a one-file change.
 * Styling is ours (unstyled + classNames -> styles.css section 23); sonner
 * provides positioning, stacking, timers, and the polite aria-live region.
 */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "toast",
          title: "toast-title",
          success: "toast-success",
          error: "toast-error",
        },
      }}
    />
  );
}

export function toastSuccess(message: string): void {
  toast.success(message);
}

export function toastError(message: string): void {
  toast.error(message);
}
