import { useConnection, useConnectionStatus } from "../../api/hooks";

export function ConnectionStatus() {
  const { data: info } = useConnection();
  const { data: status, isLoading } = useConnectionStatus();
  const label = isLoading ? "checking…" : status?.ok ? "connected" : "disconnected";
  return (
    <span role="status">
      {label}
      {info ? ` - ${info.host}:${info.port}` : ""}
    </span>
  );
}
