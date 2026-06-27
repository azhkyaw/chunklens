from __future__ import annotations

from . import connection


def get_client():
    """Production client resolves the active connection. Overridden in tests."""
    return connection.get_active_client()
