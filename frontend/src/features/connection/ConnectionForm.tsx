import { useEffect, useRef, useState } from "react";
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

  // Seed the fields from the server exactly once per mount. The form lives
  // inside a modal that remounts on every open, so this is once-per-open;
  // gating on a ref (not object identity) means a background refetch - e.g.
  // refetchOnWindowFocus after the user alt-tabs to copy a token - can never
  // wipe in-progress edits. (audit M-3)
  const seeded = useRef(false);
  useEffect(() => {
    if (!info || seeded.current) return;
    seeded.current = true;
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
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(buildInput(), { onSuccess: () => onSaved?.() });
      }}
    >
      <p className="eyebrow">Connection</p>
      <div className="form-row">
        <label className="field" style={{ flex: 2 }}>Host <input value={host} onChange={(e) => setHost(e.target.value)} /></label>
        <label className="field" style={{ flex: 1 }}>Port <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} /></label>
      </div>
      <label className="field field-inline">SSL <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} /></label>
      <div className="form-row">
        <label className="field" style={{ flex: 1 }}>Tenant <input value={tenant} onChange={(e) => setTenant(e.target.value)} /></label>
        <label className="field" style={{ flex: 1 }}>Database <input value={database} onChange={(e) => setDatabase(e.target.value)} /></label>
      </div>
      <label className="field">
        Auth
        <select value={authMode} onChange={(e) => setAuthMode(e.target.value as "none" | "token")}>
          <option value="none">None</option>
          <option value="token">Token</option>
        </select>
      </label>
      {authMode === "token" && (
        <label className="field">
          Token
          <input
            type="password"
            value={token}
            placeholder={info?.has_token ? "•••• set" : ""}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>
      )}
      <div className="form-actions">
        <button type="button" onClick={() => test.mutate(buildInput())}>Test</button>
        <button type="submit" className="btn-primary" disabled={save.isPending} aria-busy={save.isPending}>Connect</button>
      </div>
      {test.data && (
        <p role="status">{test.data.ok ? "Connection OK" : `Failed: ${test.data.error}`}</p>
      )}
      {save.error && <p role="alert">Connect failed.</p>}
    </form>
  );
}
