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
