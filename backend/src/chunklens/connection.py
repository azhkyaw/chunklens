from __future__ import annotations

from typing import Optional

from . import chroma_client
from . import config
from .schemas import ConnectionConfig

_active: Optional[ConnectionConfig] = None
_client = None


def get_active() -> ConnectionConfig:
    global _active
    if _active is None:
        _active = config.load_config()
    return _active


def set_active(cfg: ConnectionConfig) -> None:
    global _active, _client
    config.save_config(cfg)
    _active = cfg
    _client = None  # invalidate cached client


def get_active_client():
    global _client
    if _client is None:
        _client = chroma_client.client_for_config(get_active())
    return _client


def reset() -> None:
    """Test helper: clear in-memory cache (next access reloads from disk)."""
    global _active, _client
    _active = None
    _client = None
