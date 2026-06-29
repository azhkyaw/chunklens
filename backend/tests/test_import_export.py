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


def test_add_records_with_embeddings():
    client = _fresh_client()
    chroma_service.create_collection(client, "io_add", embedding_function="none")
    from chunklens.schemas import ExportRecord
    n = chroma_service.add_records(client, "io_add", [
        ExportRecord(id="r1", document="one", metadata={"k": "v"}, embedding=[1.0, 2.0]),
        ExportRecord(id="r2", document="two", embedding=[3.0, 4.0]),
    ])
    assert n == 2
    got = client.get_collection("io_add").get(ids=["r1"], include=["documents", "metadatas"])
    assert got["documents"][0] == "one"
    assert got["metadatas"][0] == {"k": "v"}


def test_add_records_none_ef_without_embedding_raises():
    client = _fresh_client()
    chroma_service.create_collection(client, "io_noemb", embedding_function="none")
    from chunklens.schemas import ExportRecord
    with pytest.raises(ValueError):
        chroma_service.add_records(client, "io_noemb", [ExportRecord(id="r1", document="x")])


def test_add_records_mixed_embedding_presence_raises():
    client = _fresh_client()
    chroma_service.create_collection(client, "io_mixed", embedding_function="none")
    from chunklens.schemas import ExportRecord
    with pytest.raises(ValueError):
        chroma_service.add_records(client, "io_mixed", [
            ExportRecord(id="r1", embedding=[1.0, 2.0]),
            ExportRecord(id="r2", document="no-emb"),
        ])


def test_export_none_ef_forces_embeddings():
    client = _fresh_client()
    chroma_service.create_collection(client, "io_exp", distance_metric="cosine", embedding_function="none")
    client.get_collection("io_exp").add(
        ids=["a", "b"], embeddings=[[1.0, 0.0], [0.0, 1.0]],
        documents=["alpha", "beta"], metadatas=[{"lang": "en"}, {"lang": "fr"}],
    )
    # include_embeddings=False, but EF=none must still force vectors in
    f = chroma_service.export_collection(client, "io_exp", include_embeddings=False)
    assert f.chunklens_export == 1
    assert f.collection.name == "io_exp"
    assert f.collection.distance_metric == "cosine"
    assert f.collection.embedding_function == "none"
    assert len(f.records) == 2
    by_id = {r.id: r for r in f.records}
    assert by_id["a"].document == "alpha"
    assert by_id["a"].metadata == {"lang": "en"}
    assert by_id["a"].embedding == [1.0, 0.0]


def test_export_default_ef_omits_embeddings_when_not_requested():
    client = _fresh_client()
    chroma_service.create_collection(client, "io_def", embedding_function="default")
    # add with explicit embeddings so no ONNX is needed (stays offline)
    client.get_collection("io_def").add(ids=["a"], embeddings=[[1.0, 2.0]], documents=["x"])
    f = chroma_service.export_collection(client, "io_def", include_embeddings=False)
    assert f.collection.embedding_function == "default"
    assert f.records[0].embedding is None
    assert f.records[0].document == "x"
