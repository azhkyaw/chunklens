from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .. import chroma_service
from .. import embedders as embedders_mod
from ..chroma_service import NotFound
from ..deps import get_client, get_embedder
from ..schemas import QueryRequest, QueryResult

router = APIRouter(prefix="/api/collections", tags=["query"])


@router.post("/{name}/query", response_model=QueryResult)
def run_query(
    name: str,
    body: QueryRequest,
    client=Depends(get_client),
    embedder=Depends(get_embedder),
):
    # Precedence: raw query_embedding as-is > embedder+query_text > query_text > error.
    query_embedding = body.query_embedding
    if query_embedding is None and body.embedder is not None and body.query_text is not None:
        try:
            query_embedding = embedder(body.embedder.provider, body.embedder.model, body.query_text)
        except embedders_mod.EmbedError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    try:
        return chroma_service.query(
            client,
            name,
            query_text=None if query_embedding is not None else body.query_text,
            query_embedding=query_embedding,
            n_results=body.n_results,
            where=body.where,
            where_document=body.where_document,
        )
    except NotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
