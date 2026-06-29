from __future__ import annotations

from chunklens import chroma_service


def _seed(client, ids, sources):
    col = client.create_collection("srcs")
    col.add(
        ids=ids,
        embeddings=[[1.0, 0.0]] * len(ids),
        documents=[f"doc {i}" for i in ids],
        metadatas=[{"source": s} if s is not None else {"other": "x"} for s in sources],
    )
    return col


def test_list_sources_counts_sorted_desc(chroma):
    _seed(chroma, ["1", "2", "3", "4", "5"], ["a", "a", "b", "b", "b"])
    sl = chroma_service.list_sources(chroma, "srcs", "source")
    assert [(s.value, s.count) for s in sl.sources] == [("b", 3), ("a", 2)]
    assert sl.total == 5 and sl.scanned == 5 and sl.key == "source"


def test_list_sources_none_bucket_for_missing_key(chroma):
    _seed(chroma, ["1", "2", "3"], ["a", "a", None])
    sl = chroma_service.list_sources(chroma, "srcs", "source")
    assert {s.value: s.count for s in sl.sources} == {"a": 2, "(none)": 1}


def test_list_sources_cap_limits_scan(chroma):
    _seed(chroma, ["1", "2", "3", "4", "5"], ["a", "a", "b", "b", "b"])
    sl = chroma_service.list_sources(chroma, "srcs", "source", cap=2)
    assert sl.scanned == 2 and sl.total == 5
    assert sum(s.count for s in sl.sources) == 2


def test_get_records_with_where_filters_and_counts(chroma):
    col = chroma.create_collection("srcs")
    col.add(
        ids=["1", "2", "3"],
        embeddings=[[1.0, 0.0]] * 3,
        documents=["x", "y", "z"],
        metadatas=[{"source": "a"}, {"source": "a"}, {"source": "b"}],
    )
    page = chroma_service.get_records(chroma, "srcs", where={"source": {"$eq": "a"}})
    assert page.total == 2
    assert {i.id for i in page.items} == {"1", "2"}


def test_sources_endpoint_lists_documents(api):
    r = api.get("/api/collections/docs/sources?key=lang")
    assert r.status_code == 200
    body = r.json()
    assert {s["value"]: s["count"] for s in body["sources"]} == {"en": 2, "fr": 1}
    assert body["total"] == 3 and body["key"] == "lang"


def test_source_records_endpoint_filters(api):
    r = api.get("/api/collections/docs/source-records?key=lang&value=en")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    assert {i["id"] for i in body["items"]} == {"a", "c"}
