import { useConnection, useConnectionStatus } from "../../api/hooks";

/**
 * App-level, persistent connection-down banner - distinct from per-panel
 * fetch errors. Renders nothing until a status check has actually failed:
 * on the first paint the query is still in flight (`status` undefined), and
 * flashing "chroma unreachable" on every cold start would be worse than the
 * bug this fixes.
 */
export function ConnectionBanner({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data: info } = useConnection();
  const { data: status, refetch, isFetching } = useConnectionStatus();
  if (!status || status.ok) return null;
  return (
    <div role="alert" className="conn-banner">
      <span className="led" aria-hidden="true" />
      <span>
        chroma unreachable{info ? ` at ${info.host}:${info.port}` : ""} · check the server or the
        connection settings
      </span>
      <button type="button" className="btn-sm" onClick={() => refetch()} disabled={isFetching}>
        Retry
      </button>
      <button type="button" className="btn-sm" onClick={onOpenSettings}>
        Connection settings
      </button>
    </div>
  );
}
