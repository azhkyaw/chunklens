from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

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


class SPAStaticFiles(StaticFiles):
    """StaticFiles that serves index.html for unknown non-API paths.

    The SPA owns client-side routes like /c/<collection>/<tab>; a browser
    refresh or deep link there must get index.html, not a 404. API paths
    keep their real 404 so clients never mistake index.html for JSON.
    """

    async def get_response(self, path: str, scope):  # type: ignore[override]
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            # get_path() joins with os.sep, which is a backslash on Windows;
            # normalize before the prefix check so this works on every OS.
            normalized = path.replace(os.sep, "/")
            if exc.status_code == 404 and not normalized.startswith("api/"):
                return await super().get_response("index.html", scope)
            raise


def create_app(web_dir: Path | None = None) -> FastAPI:
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
    # Tests inject web_dir; production autodetects the packaged build.
    web_dir = web_dir if web_dir is not None else Path(__file__).parent / "web"
    if web_dir.is_dir():
        app.mount("/", SPAStaticFiles(directory=str(web_dir), html=True), name="web")

    return app


app = create_app()
