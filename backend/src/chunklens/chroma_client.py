from __future__ import annotations

from typing import Optional

import chromadb

DEFAULT_HOST = "localhost"
DEFAULT_PORT = 8000


def make_client(
    host: str = DEFAULT_HOST,
    port: int = DEFAULT_PORT,
    tenant: str = "default_tenant",
    database: str = "default_database",
    headers: Optional[dict] = None,
):
    """Build a real HTTP client against a running Chroma server."""
    return chromadb.HttpClient(
        host=host,
        port=port,
        tenant=tenant,
        database=database,
        headers=headers or {},
    )


def heartbeat(client) -> int:
    """Return the server heartbeat (nanoseconds). Raises if unreachable."""
    return client.heartbeat()
