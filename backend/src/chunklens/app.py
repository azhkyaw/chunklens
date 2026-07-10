from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles

from . import __version__
from .routers import collections, connection, embedders, query
from .schemas import HealthResponse

_LOOPBACK_HOSTS = ["127.0.0.1", "localhost", "::1"]


def _allowed_hosts() -> list[str]:
    host = os.environ.get("CHUNKLENS_HOST", "127.0.0.1")
    if host in _LOOPBACK_HOSTS:
        return _LOOPBACK_HOSTS
    # Explicit off-loopback bind: requests arrive under the machine's real
    # hostname/IP, which we cannot enumerate; the launcher warns instead.
    return ["*"]


def create_app() -> FastAPI:
    app = FastAPI(title="ChunkLens", version=__version__)

    # Rejecting foreign Host headers blocks DNS-rebinding pages from reaching
    # the (unauthenticated, loopback-only) API as if they were same-origin.
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts())

    @app.get("/api/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok", version=__version__)

    app.include_router(collections.router)
    app.include_router(query.router)
    app.include_router(connection.router)
    app.include_router(embedders.router)

    # SPA build (present only after `npm run build`); mounted last so /api wins.
    web_dir = Path(__file__).parent / "web"
    if web_dir.is_dir():
        app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="web")

    return app


app = create_app()
