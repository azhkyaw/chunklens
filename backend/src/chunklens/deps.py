from __future__ import annotations

from . import connection, embedders


def get_client():
    """Production client resolves the active connection. Overridden in tests."""
    return connection.get_active_client()


def get_embedder():
    """Production embedder is the registry-backed embed(). Overridden in tests with a
    deterministic fake so unit tests never touch a real provider or the network."""
    return embedders.embed


def get_active_config():
    """The active ConnectionConfig (conn-key source for embedder hints). Overridden in tests."""
    return connection.get_active()
