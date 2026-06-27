from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import __version__
from .routers import collections, query
from .schemas import HealthResponse


def create_app() -> FastAPI:
    app = FastAPI(title="ChunkLens", version=__version__)

    @app.get("/api/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok", version=__version__)

    app.include_router(collections.router)
    app.include_router(query.router)

    # SPA build (present only after `npm run build`); mounted last so /api wins.
    web_dir = Path(__file__).parent / "web"
    if web_dir.is_dir():
        app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="web")

    return app


app = create_app()
