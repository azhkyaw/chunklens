import { useSyncExternalStore } from "react";
import { useCollectionDetails, useConnection, useConnectionStatus } from "./api/hooks";
import { getLastLatency, subscribeLatency } from "./lib/latency";

/**
 * Persistent instrument footer: connection LED + address on the left,
 * open-collection stats + distance metric on the right.
 */
export function StatusBar({ collection }: { collection: string | null }) {
  const { data: info } = useConnection();
  const { data: status, isLoading } = useConnectionStatus();
  const state = isLoading ? "checking" : status?.ok ? "connected" : "disconnected";
  const { data: details } = useCollectionDetails(collection);
  const lastMs = useSyncExternalStore(subscribeLatency, getLastLatency);
  return (
    <footer className="statusbar" aria-label="Status">
      <span className="statusbar-conn" data-state={state}>
        <span className="led" aria-hidden="true" />
        {info && (
          <span>
            {info.host}:{info.port}
          </span>
        )}
      </span>
      {collection && details && (
        <span className="statusbar-stats">
          {details.count} records · {details.dimensionality ?? "?"} dims · {details.distance_metric}
        </span>
      )}
      {lastMs != null && <span className="statusbar-latency">last query {lastMs} ms</span>}
      <span className="statusbar-hints">j/k navigate · ? shortcuts</span>
    </footer>
  );
}
