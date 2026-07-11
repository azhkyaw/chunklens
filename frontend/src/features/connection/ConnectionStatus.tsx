import { useConnection, useConnectionStatus } from "../../api/hooks";

/** Topbar connection pill: LED + state + address + tenant. Opens settings. */
export function ConnectionStatus({ onOpen }: { onOpen: () => void }) {
  const { data: info } = useConnection();
  const { data: status, isLoading, isError } = useConnectionStatus();
  // isError first: a failed status check keeps the last successful `data` in
  // TanStack v5, so `status?.ok` would still read true and the pill would say
  // "connected" while the backend is unreachable.
  const state = isError
    ? "disconnected"
    : isLoading
      ? "checking"
      : status?.ok
        ? "connected"
        : "disconnected";
  const label = state === "checking" ? "checking…" : state;
  return (
    <button
      type="button"
      className="conn-status"
      data-state={state}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <span className="led" aria-hidden="true" />
      <span className="conn-label">{label}</span>
      {info && (
        <span className="conn-addr">
          {info.host}:{info.port} · {info.tenant}
        </span>
      )}
    </button>
  );
}
