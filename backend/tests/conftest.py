from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from chunklens.app import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
