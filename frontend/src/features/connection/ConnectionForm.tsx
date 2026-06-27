import { useEffect, useState } from "react";
import { useConnection, useSaveConnection, useTestConnection } from "../../api/hooks";
import type { ConnectionInput } from "../../api/types";

export function ConnectionForm({ onSaved }: { onSaved?: () => void }) {
  const { data: info } = useConnection();
  const save = useSaveConnection();
  const test = useTestConnection();

  const [host, setHost] = useState("localhost");
  const [port, setPort] = useState(8000);
  const [ssl, setSsl] = useState(false);
  const [tenant, setTenant] = useState("default_tenant");
  const [database, setDatabase] = useState("default_database");
  const [authMode, setAuthMode] = useState<"none" | "token">("none");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!info) return;
    setHost(info.host);
    setPort(info.port);
    setSsl(info.ssl);
    setTenant(info.tenant);
    setDatabase(info.database);
    setAuthMode(info.auth_mode);
  }, [info]);

  function buildInput(): ConnectionInput {
    const base: ConnectionInput = { host, port, ssl, tenant, database, auth_mode: authMode };
    return token ? { ...base, token } : base;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(buildInput(), { onSuccess: () => onSaved?.() });
      }}
    >
      <label>Host <input value={host} onChange={(e) => setHost(e.target.value)} /></label>
      <label>Port <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} /></label>
      <label>SSL <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} /></label>
      <label>Tenant <input value={tenant} onChange={(e) => setTenant(e.target.value)} /></label>
      <label>Database <input value={database} onChange={(e) => setDatabase(e.target.value)} /></label>
      <label>
        Auth{" "}
        <select value={authMode} onChange={(e) => setAuthMode(e.target.value as "none" | "token")}>
          <option value="none">None</option>
          <option value="token">Token</option>
        </select>
      </label>
      {authMode === "token" && (
        <label>
          Token{" "}
          <input
            type="password"
            value={token}
            placeholder={info?.has_token ? "•••• set" : ""}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
      )}
      <button type="button" onClick={() => test.mutate(buildInput())}>Test</button>
      <button type="submit" disabled={save.isPending}>Save</button>
      {test.data && (
        <p role="status">{test.data.ok ? "Connection OK" : `Failed: ${test.data.error}`}</p>
      )}
      {save.error && <p role="alert">Save failed.</p>}
    </form>
  );
}
