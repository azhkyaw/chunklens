from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Body, HTTPException

from .. import chroma_client, connection
from ..schemas import ConnectionConfig, ConnectionInfo, ConnectionTestResult

router = APIRouter(prefix="/api/connection", tags=["connection"])


def _info(cfg: ConnectionConfig) -> ConnectionInfo:
    return ConnectionInfo(
        host=cfg.host,
        port=cfg.port,
        ssl=cfg.ssl,
        tenant=cfg.tenant,
        database=cfg.database,
        auth_mode=cfg.auth_mode,
        has_token=bool(cfg.token),
    )


@router.get("", response_model=ConnectionInfo)
def get_connection():
    return _info(connection.get_active())


@router.put("", response_model=ConnectionInfo)
def put_connection(body: ConnectionConfig):
    if body.auth_mode == "token":
        cfg = body if body.token else body.model_copy(
            update={"token": connection.get_active().token}
        )
        if not cfg.token:
            raise HTTPException(status_code=400, detail="Token required for token auth")
    else:
        cfg = body.model_copy(update={"token": None})
    connection.set_active(cfg)
    return _info(connection.get_active())


@router.post("/test", response_model=ConnectionTestResult)
def test_connection(body: Optional[ConnectionConfig] = Body(default=None)):
    if body is None:
        cfg = connection.get_active()
    else:
        cfg = body
        if cfg.auth_mode == "token" and not cfg.token:
            cfg = cfg.model_copy(update={"token": connection.get_active().token})
    try:
        client = chroma_client.client_for_config(cfg)
        return ConnectionTestResult(ok=True, heartbeat_ns=chroma_client.heartbeat(client))
    except Exception as exc:  # connection failure is data, not a 500
        return ConnectionTestResult(ok=False, error=str(exc))
