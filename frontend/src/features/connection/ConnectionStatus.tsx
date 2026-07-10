import { useConnection, useConnectionStatus } from "../../api/hooks";

/** Topbar connection pill: LED + state + address + tenant. Opens settings. */
export function ConnectionStatus({ onOpen }: { onOpen: () => void }) {
  const { data: info } = useConnection();
  const { data: status, isLoading } = useConnectionStatus();
  const state = isLoading ? "checking" : status?.ok ? "connected" : "disconnected";
  const label = isLoading ? "checking…" : status?.ok ? "connected" : "disconnected";
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
