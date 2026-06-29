from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import embedders
from ..schemas import EmbedderInfo

router = APIRouter(prefix="/api/embedders", tags=["embedders"])


class SetKeyRequest(BaseModel):
    token: str


@router.get("", response_model=list[EmbedderInfo])
def get_embedders():
    return embedders.list_embedders()


@router.post("/{provider}/key", status_code=204)
def set_embedder_key(provider: str, body: SetKeyRequest):
    try:
        embedders.set_key(provider, body.token)
    except embedders.InvalidProvider as exc:
        raise HTTPException(status_code=404, detail=str(exc))
