from __future__ import annotations

from typing import Annotated, Any, Literal, Optional

from pydantic import AfterValidator, BaseModel, Field


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


class ConnectionInfo(BaseModel):
    host: str
    port: int
    ssl: bool
    tenant: str
    database: str
    auth_mode: str
    has_token: bool


class ConnectionTestResult(BaseModel):
    ok: bool
    error: Optional[str] = None
    heartbeat_ns: Optional[int] = None


def _scalars_only(v: Optional[dict]) -> Optional[dict]:
    if v is None:
        return v
    for key, val in v.items():
        # bool is a subclass of int; both are allowed scalars
        if not isinstance(val, (str, int, float, bool)):
            raise ValueError(
                f"metadata[{key!r}] must be a scalar (str/int/float/bool)"
            )
    return v


ScalarMetadata = Annotated[dict[str, Any], AfterValidator(_scalars_only)]


class CreateCollectionRequest(BaseModel):
    name: str
    distance_metric: Literal["l2", "cosine", "ip"] = "l2"
    embedding_function: Literal["default", "none"] = "default"
    metadata: Optional[ScalarMetadata] = None


class CollectionDetails(BaseModel):
    name: str
    count: int
    dimensionality: Optional[int] = None
    distance_metric: str
    embedding_function: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class UpdateCollectionRequest(BaseModel):
    name: Optional[str] = None
    metadata: Optional[ScalarMetadata] = None


class UpdateRecordMetadataRequest(BaseModel):
    metadata: ScalarMetadata


class MetadataKeyInfo(BaseModel):
    key: str
    types: list[str]


class MetadataKeysResponse(BaseModel):
    keys: list[MetadataKeyInfo]
    sampled: int
    total: int


class ExportRecord(BaseModel):
    id: str
    document: Optional[str] = None
    metadata: Optional[ScalarMetadata] = None
    embedding: Optional[list[float]] = None


class ExportCollection(BaseModel):
    name: str
    distance_metric: Literal["l2", "cosine", "ip"] = "l2"
    embedding_function: Literal["default", "none"] = "default"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ExportFile(BaseModel):
    chunklens_export: int = 1
    collection: ExportCollection
    records: list[ExportRecord] = Field(default_factory=list)
