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


def _sample_file(name="src_col"):
    from chunklens.schemas import ExportFile
    return ExportFile(
        chunklens_export=1,
        collection={"name": name, "distance_metric": "l2", "embedding_function": "none", "metadata": {"owner": "me"}},
        records=[
            {"id": "a", "document": "alpha", "metadata": {"lang": "en"}, "embedding": [1.0, 0.0]},
            {"id": "b", "document": "beta", "metadata": {"lang": "fr"}, "embedding": [0.0, 1.0]},
        ],
    )


def test_import_creates_collection_with_records():
    client = _fresh_client()
    d = chroma_service.import_collection(client, _sample_file(), name_override="imported_col")
    assert d.name == "imported_col"
    assert d.count == 2
    assert d.embedding_function == "none"
    assert d.metadata == {"owner": "me"}


def test_import_round_trips():
    client = _fresh_client()
    chroma_service.import_collection(client, _sample_file("orig_col"), name_override="orig_col")
    exported = chroma_service.export_collection(client, "orig_col", include_embeddings=True)
    chroma_service.import_collection(client, exported, name_override="copy_col")
    a = chroma_service.export_collection(client, "orig_col", include_embeddings=True)
    b = chroma_service.export_collection(client, "copy_col", include_embeddings=True)
    key = lambda f: sorted([(r.id, r.document, tuple((r.metadata or {}).items()), tuple(r.embedding or [])) for r in f.records])
    assert key(a) == key(b)


def test_import_conflict_raises():
    client = _fresh_client()
    chroma_service.import_collection(client, _sample_file(), name_override="dup_col")
    with pytest.raises(chroma_service.Conflict):
        chroma_service.import_collection(client, _sample_file(), name_override="dup_col")


def test_import_rolls_back_on_add_failure():
    client = _fresh_client()
    from chunklens.schemas import ExportFile
    bad = ExportFile(
        collection={"name": "rb_col", "embedding_function": "none"},
        records=[{"id": "a", "document": "no embedding here"}],  # none-EF + no embedding -> add fails
    )
    with pytest.raises(ValueError):
        chroma_service.import_collection(client, bad, name_override="rb_col")
    assert not chroma_service.collection_exists(client, "rb_col")  # cleaned up
