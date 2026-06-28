import pytest
from pydantic import ValidationError

from chunklens.schemas import (
    CreateCollectionRequest,
    UpdateRecordMetadataRequest,
)


def test_create_defaults():
    req = CreateCollectionRequest(name="my_col")
    assert req.distance_metric == "l2"
    assert req.embedding_function == "default"
    assert req.metadata is None


def test_scalar_metadata_accepts_scalars():
    req = UpdateRecordMetadataRequest(metadata={"s": "x", "i": 1, "f": 1.5, "b": True})
    assert req.metadata["i"] == 1


def test_scalar_metadata_rejects_nested():
    with pytest.raises(ValidationError):
        UpdateRecordMetadataRequest(metadata={"bad": {"nested": 1}})


def test_scalar_metadata_rejects_list():
    with pytest.raises(ValidationError):
        UpdateRecordMetadataRequest(metadata={"bad": [1, 2]})
