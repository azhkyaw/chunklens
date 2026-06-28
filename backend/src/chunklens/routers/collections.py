from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .. import chroma_service
from ..chroma_service import Conflict, InvalidName, NotFound
from ..deps import get_client
from ..schemas import (
    CollectionDetails,
    CollectionSummary,
    CreateCollectionRequest,
    Record,
    RecordsPage,
    UpdateCollectionRequest,
    UpdateRecordMetadataRequest,
)

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


@router.post("", response_model=CollectionDetails, status_code=201)
def create_collection(body: CreateCollectionRequest, client=Depends(get_client)):
    try:
        return chroma_service.create_collection(
            client,
            body.name,
            distance_metric=body.distance_metric,
            embedding_function=body.embedding_function,
            metadata=body.metadata,
        )
    except Conflict as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except InvalidName as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{name}", response_model=CollectionDetails)
def get_collection(name: str, client=Depends(get_client)):
    try:
        return chroma_service.get_collection_details(client, name)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/{name}", response_model=CollectionDetails)
def update_collection(name: str, body: UpdateCollectionRequest, client=Depends(get_client)):
    try:
        if body.name is not None and body.name != name:
            chroma_service.rename_collection(client, name, body.name)
            name = body.name
        if body.metadata is not None:
            return chroma_service.update_collection_metadata(client, name, body.metadata)
        return chroma_service.get_collection_details(client, name)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Conflict as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except InvalidName as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete("/{name}", status_code=204)
def delete_collection(name: str, client=Depends(get_client)):
    try:
        chroma_service.delete_collection(client, name)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/{name}/records/{record_id}", response_model=Record)
def update_record_metadata(
    name: str, record_id: str, body: UpdateRecordMetadataRequest, client=Depends(get_client)
):
    try:
        return chroma_service.update_record_metadata(client, name, record_id, body.metadata)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
