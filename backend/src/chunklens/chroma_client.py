from __future__ import annotations

from typing import Optional

import chromadb

from .schemas import ConnectionConfig

DEFAULT_HOST = "localhost"
DEFAULT_PORT = 8000


def make_client(
    host: str = DEFAULT_HOST,
    port: int = DEFAULT_PORT,
    ssl: bool = False,
    tenant: str = "default_tenant",
    database: str = "default_database",
    headers: Optional[dict] = None,
):
    """Build a real HTTP client against a running Chroma server."""
    return chromadb.HttpClient(
        host=host,
        port=port,
        ssl=ssl,
        tenant=tenant,
        database=database,
        headers=headers or {},
    )


def heartbeat(client) -> int:
    """Return the server heartbeat (nanoseconds). Raises if unreachable."""
    return client.heartbeat()


def headers_for(cfg: ConnectionConfig) -> dict:
    if cfg.auth_mode == "token" and cfg.token:
        return {"Authorization": f"Bearer {cfg.token}"}
    return {}


def client_for_config(cfg: ConnectionConfig):
    return make_client(
        host=cfg.host,
        port=cfg.port,
        ssl=cfg.ssl,
        tenant=cfg.tenant,
        database=cfg.database,
        headers=headers_for(cfg),
    )
