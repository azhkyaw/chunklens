from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from .. import chroma_service
from .. import embedder_hints
from .. import embedders
from ..chroma_service import Conflict, InvalidName, NotFound
from ..deps import get_active_config, get_client
from ..schemas import (
    CollectionDetails,
    CollectionSummary,
    CreateCollectionRequest,
    EmbedderSpec,
    ExportFile,
    MetadataKeysResponse,
    Record,
    RecordDetail,
    RecordsPage,
    SourceList,
    UpdateCollectionRequest,
    UpdateRecordMetadataRequest,
)

router = APIRouter(prefix="/api/collections", tags=["collections"])


@router.get("", response_model=list[CollectionSummary])
def list_collections(client=Depends(get_client)):
    return chroma_service.list_collections(client)


@router.get("/{name}/records", response_model=RecordsPage)
def get_records(
    name: str,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    client=Depends(get_client),
):
    try:
        return chroma_service.get_records(client, name, limit=limit, offset=offset)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{name}/records/{record_id}", response_model=RecordDetail)
def get_record(name: str, record_id: str, client=Depends(get_client)):
    try:
        return chroma_service.get_record(client, name, record_id)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{name}/sources", response_model=SourceList)
def list_sources(name: str, key: str, cap: int = Query(10000, ge=1, le=100000), client=Depends(get_client)):
    try:
        return chroma_service.list_sources(client, name, key, cap=cap)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{name}/source-records", response_model=RecordsPage)
def get_source_records(
    name: str,
    key: str,
    value: str,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    client=Depends(get_client),
):
    try:
        return chroma_service.get_records(client, name, limit=limit, offset=offset, where={key: {"$eq": value}})
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{name}/export", response_model=ExportFile)
def export_collection(name: str, include_embeddings: bool = False, client=Depends(get_client)):
    try:
        return chroma_service.export_collection(client, name, include_embeddings=include_embeddings)
    except NotFound as exc:
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


@router.post("/import", response_model=CollectionDetails, status_code=201)
def import_collection(body: ExportFile, name: Optional[str] = None, client=Depends(get_client)):
    try:
        return chroma_service.import_collection(client, body, name_override=name)
    except Conflict as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except (InvalidName, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{name}", response_model=CollectionDetails)
def get_collection(name: str, client=Depends(get_client), cfg=Depends(get_active_config)):
    try:
        details = chroma_service.get_collection_details(client, name)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    details.embedder_hint = embedder_hints.load_hint(cfg, name)
    return details


@router.put("/{name}/embedder", status_code=204)
def set_collection_embedder(name: str, body: EmbedderSpec, cfg=Depends(get_active_config)):
    if body.provider not in {e.id for e in embedders.list_embedders()}:
        raise HTTPException(status_code=400, detail=f"Unknown embedding provider {body.provider!r}")
    embedder_hints.save_hint(cfg, name, body)


@router.delete("/{name}/embedder", status_code=204)
def clear_collection_embedder(name: str, cfg=Depends(get_active_config)):
    embedder_hints.clear_hint(cfg, name)


@router.patch("/{name}", response_model=CollectionDetails)
def update_collection(
    name: str, body: UpdateCollectionRequest,
    client=Depends(get_client), cfg=Depends(get_active_config),
):
    try:
        if body.name is not None and body.name != name:
            chroma_service.rename_collection(client, name, body.name)
            embedder_hints.move_hint(cfg, name, body.name)
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
def delete_collection(name: str, client=Depends(get_client), cfg=Depends(get_active_config)):
    try:
        chroma_service.delete_collection(client, name)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    embedder_hints.clear_hint(cfg, name)


@router.patch("/{name}/records/{record_id}", response_model=Record)
def update_record_metadata(
    name: str, record_id: str, body: UpdateRecordMetadataRequest, client=Depends(get_client)
):
    try:
        return chroma_service.update_record_metadata(client, name, record_id, body.metadata)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{name}/metadata-keys", response_model=MetadataKeysResponse)
def metadata_keys(name: str, sample: int = Query(200, ge=1, le=10000), client=Depends(get_client)):
    try:
        return chroma_service.sample_metadata_keys(client, name, sample=sample)
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
