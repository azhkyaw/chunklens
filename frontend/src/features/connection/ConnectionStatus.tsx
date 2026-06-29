import { useConnection, useConnectionStatus } from "../../api/hooks";

export function ConnectionStatus() {
  const { data: info } = useConnection();
  const { data: status, isLoading } = useConnectionStatus();
  const state = isLoading ? "checking" : status?.ok ? "connected" : "disconnected";
  const label = isLoading ? "checking…" : status?.ok ? "connected" : "disconnected";
  return (
    <span className="conn-status" role="status" data-state={state}>
      <span className="led" aria-hidden="true" />
      <span className="conn-label">{label}</span>
      {info && <span className="conn-addr">{info.host}:{info.port}</span>}
    </span>
  );
}
