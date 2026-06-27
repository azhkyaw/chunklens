from __future__ import annotations

import os

from .chroma_client import make_client


def get_client():
    """Production client. Overridden in tests via app.dependency_overrides."""
    host = os.environ.get("CHUNKLENS_CHROMA_HOST", "localhost")
    port = int(os.environ.get("CHUNKLENS_CHROMA_PORT", "8000"))
    return make_client(host=host, port=port)
