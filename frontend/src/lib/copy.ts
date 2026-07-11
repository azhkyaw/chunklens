import { toastError, toastSuccess } from "../ui/toast";

// The single clipboard chokepoint: every copy affordance funnels here so the
// confirmation voice stays uniform and tests stub exactly one seam.
export async function copyText(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toastSuccess(`${what} copied`);
  } catch {
    toastError("Copy failed - clipboard unavailable");
  }
}
