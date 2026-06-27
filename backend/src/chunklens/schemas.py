from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


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


class ConnectionConfig(BaseModel):
    host: str = "localhost"
    port: int = Field(default=8000, ge=1, le=65535)
    ssl: bool = False
    tenant: str = "default_tenant"
    database: str = "default_database"
    auth_mode: Literal["none", "token"] = "none"
    token: Optional[str] = None
