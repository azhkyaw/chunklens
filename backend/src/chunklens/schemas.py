from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str


class CollectionSummary(BaseModel):
    name: str
    count: int


class Record(BaseModel):
    id: str
    document: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None


class RecordsPage(BaseModel):
    items: list[Record]
    limit: int
    offset: int
    total: int


class QueryRequest(BaseModel):
    query_text: Optional[str] = None
    query_embedding: Optional[list[float]] = None
    n_results: int = 10
    where: Optional[dict[str, Any]] = None
    where_document: Optional[dict[str, Any]] = None


class QueryHit(BaseModel):
    id: str
    document: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None
    distance: float


class QueryResult(BaseModel):
    hits: list[QueryHit]
