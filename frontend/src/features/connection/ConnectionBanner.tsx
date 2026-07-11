import { useConnection, useConnectionStatus } from "../../api/hooks";

/**
 * App-level, persistent connection-down banner - distinct from per-panel
 * fetch errors. Renders nothing until a status check has actually settled
 * badly: on the first paint the query is still in flight (no data, no error),
 * and flashing "unreachable" on every cold start would be worse than the bug
 * this fixes.
 */
export function ConnectionBanner({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { data: info } = useConnection();
  const { data: status, isError, refetch, isFetching } = useConnectionStatus();
  // Two distinct failures. (1) The backend answered and reported chroma down
  // (`ok: false`). (2) The status check itself failed - the chunklens backend
  // is unreachable. Case 2 must be read from `isError`, not from `status`:
  // TanStack v5 keeps the last successful `data` when a refetch rejects, so a
  // stale `{ ok: true }` would otherwise leave the app on a green LED with no
  // banner while the server is gone.
  const down = isError || (status !== undefined && !status.ok);
  if (!down) return null;
  const address = info ? `${info.host}:${info.port}` : "";
  // Say only what is true in each case: when the check itself failed we cannot
  // claim anything about chroma - we never got an answer about it.
  const message = isError
    ? "connection check failed · chunklens is not responding · check that the app server is running"
    : `chroma unreachable${address ? ` at ${address}` : ""} · check the server or the connection settings`;
  return (
    <div role="alert" className="conn-banner">
      <span className="led" aria-hidden="true" />
      <span>{message}</span>
      <button type="button" className="btn-sm" onClick={() => refetch()} disabled={isFetching}>
        Retry
      </button>
      <button type="button" className="btn-sm" onClick={onOpenSettings}>
        Connection settings
      </button>
    </div>
  );
}
