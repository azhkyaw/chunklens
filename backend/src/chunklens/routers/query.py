from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .. import chroma_service
from ..deps import get_client
from ..schemas import QueryRequest, QueryResult

router = APIRouter(prefix="/api/collections", tags=["query"])


@router.post("/{name}/query", response_model=QueryResult)
def run_query(name: str, body: QueryRequest, client=Depends(get_client)):
    try:
        return chroma_service.query(
            client,
            name,
            query_text=body.query_text,
            query_embedding=body.query_embedding,
            n_results=body.n_results,
            where=body.where,
            where_document=body.where_document,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))
