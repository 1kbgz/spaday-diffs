import asyncio

import httpx
import pytest

from spaday_diffs import example


async def request(method, path, **kwargs):
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=example.app), base_url="http://example") as client:
        return await client.request(method, path, **kwargs)


def test_example_serves_real_components():
    response = asyncio.run(request("GET", "/tree.json"))
    assert response.status_code == 200
    assert response.text.count('"tag": "spaday-diff"') == 5


def test_example_round_trip():
    response = asyncio.run(request("POST", "/api/diff/selection", json={"range": {"start": 1, "end": 2, "side": "additions"}}))
    assert response.status_code == 200
    assert example.feed.selected_lines == {"start": 1, "end": 2, "side": "additions"}
    assert "Python received" in example.feed.sync_status
    original = example.feed.revision
    for action in ("revision", "layout", "wrap", "clear"):
        assert asyncio.run(request("POST", f"/api/diff/{action}", json={})).status_code == 200
    assert example.feed.revision == original + 1
    assert example.feed.new_file == example.revision_file(example.feed.revision)
    assert example.feed.selected_lines is None
    assert asyncio.run(request("POST", "/api/diff/unknown", json={})).status_code == 404


def test_background_updates_python_model(monkeypatch):
    original = example.feed.revision
    calls = 0

    class Done(Exception):
        pass

    async def sleep(_):
        nonlocal calls
        calls += 1
        if calls > 1:
            raise Done

    monkeypatch.setattr(example.asyncio, "sleep", sleep)
    with pytest.raises(Done):
        asyncio.run(example.update_server_file())
    assert example.feed.revision == original + 1
