from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .. import chroma_service
from ..deps import get_client
from ..schemas import CollectionSummary, RecordsPage

router = APIRouter(prefix="/api/collections", tags=["collections"])


@router.get("", response_model=list[CollectionSummary])
def list_collections(client=Depends(get_client)):
    return chroma_service.list_collections(client)


@router.get("/{name}/records", response_model=RecordsPage)
def get_records(name: str, limit: int = 50, offset: int = 0, client=Depends(get_client)):
    try:
        return chroma_service.get_records(client, name, limit=limit, offset=offset)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))
