from __future__ import annotations

from fastapi import APIRouter, Depends

from .. import chroma_service
from ..deps import get_client
from ..schemas import CollectionSummary

router = APIRouter(prefix="/api/collections", tags=["collections"])


@router.get("", response_model=list[CollectionSummary])
def list_collections(client=Depends(get_client)):
    return chroma_service.list_collections(client)
