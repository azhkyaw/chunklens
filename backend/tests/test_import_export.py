import chromadb
import pytest

from chunklens import chroma_service
from chunklens.schemas import ExportFile, ExportRecord


def _fresh_client():
    client = chromadb.EphemeralClient()
    for c in client.list_collections():
        client.delete_collection(c if isinstance(c, str) else c.name)
    return client


def test_export_file_parses_minimal():
    f = ExportFile(collection={"name": "c"}, records=[{"id": "a"}])
    assert f.chunklens_export == 1
    assert f.collection.name == "c"
    assert f.collection.distance_metric == "l2"
    assert f.collection.embedding_function == "default"
    assert f.records[0].id == "a"
    assert f.records[0].embedding is None


def test_export_record_rejects_nonscalar_metadata():
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        ExportFile(collection={"name": "c"}, records=[{"id": "a", "metadata": {"bad": [1, 2]}}])
