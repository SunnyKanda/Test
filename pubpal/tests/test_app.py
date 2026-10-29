import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("PUBPAL_ADMIN_TOKEN", "secret")
    import db

    monkeypatch.setattr(db, "DB_PATH", str(tmp_path / "test.db"))
    db.init_db()
    import seed_demo

    seed_demo.main()
    from fastapi.testclient import TestClient
    import server

    return TestClient(server.app)


CENTRE = {"lat": 53.7245, "lng": -1.8616}
ADMIN = {"X-Admin-Token": "secret"}


def test_radius_search_sorted_by_distance(client):
    near = client.get("/api/pubs", params={**CENTRE, "radius_km": 1}).json()["results"]
    far = client.get("/api/pubs", params={**CENTRE, "radius_km": 10}).json()["results"]
    assert 0 < len(near) < len(far)
    assert all(p["distance_km"] <= 1 for p in near)
    distances = [p["distance_km"] for p in far]
    assert distances == sorted(distances)


def test_filters_require_yes(client):
    pubs = client.get("/api/pubs", params={**CENTRE, "radius_km": 25, "has": "dog_friendly,cider"}).json()["results"]
    assert pubs
    assert all(p["facilities"]["dog_friendly"] and p["drinks"]["cider"] for p in pubs)


def test_unknown_filter_rejected(client):
    assert client.get("/api/pubs", params={**CENTRE, "has": "karaoke"}).status_code == 400


def test_radius_capped(client):
    assert client.get("/api/pubs", params={**CENTRE, "radius_km": 100}).status_code == 422


def test_edit_suggestion_applies_only_after_approval(client):
    pub = client.get("/api/pubs", params={**CENTRE, "radius_km": 25}).json()["results"][0]
    r = client.post(f"/api/pubs/{pub['id']}/suggestions", json={"flags": {"pool_table": True}})
    assert r.status_code == 201
    assert client.get(f"/api/pubs/{pub['id']}").json()["facilities"]["pool_table"] == pub["facilities"]["pool_table"]

    pending = client.get("/api/admin/suggestions", headers=ADMIN).json()["suggestions"]
    assert len(pending) == 1
    assert client.post(f"/api/admin/suggestions/{pending[0]['id']}/approve", headers=ADMIN).status_code == 200
    assert client.get(f"/api/pubs/{pub['id']}").json()["facilities"]["pool_table"] is True
    assert client.get("/api/admin/suggestions", headers=ADMIN).json()["suggestions"] == []


def test_new_pub_suggestion(client):
    body = {"name": "The New One", "lat": 53.7250, "lng": -1.8600, "flags": {"cider": True}}
    sid = client.post("/api/suggestions", json=body).json()["id"]
    client.post(f"/api/admin/suggestions/{sid}/approve", headers=ADMIN)
    names = [p["name"] for p in client.get("/api/pubs", params={**CENTRE, "radius_km": 1}).json()["results"]]
    assert "The New One" in names


def test_rejected_suggestion_changes_nothing(client):
    pub = client.get("/api/pubs", params={**CENTRE, "radius_km": 25}).json()["results"][0]
    sid = client.post(f"/api/pubs/{pub['id']}/suggestions", json={"name": "Vandalised"}).json()["id"]
    client.post(f"/api/admin/suggestions/{sid}/reject", headers=ADMIN)
    assert client.get(f"/api/pubs/{pub['id']}").json()["name"] == pub["name"]


def test_suggestion_validation(client):
    assert client.post("/api/suggestions", json={"name": "No location"}).status_code == 400
    assert client.post("/api/pubs/1/suggestions", json={"flags": {"karaoke": True}}).status_code == 400
    assert client.post("/api/pubs/1/suggestions", json={}).status_code == 400


def test_admin_needs_token(client):
    assert client.get("/api/admin/suggestions").status_code == 401
    assert client.get("/api/admin/suggestions", headers={"X-Admin-Token": "nope"}).status_code == 401


def test_osm_mapping_and_reimport_keeps_known_values(client):
    import db
    import import_osm

    el = {
        "type": "node", "id": 1, "lat": 53.72, "lon": -1.86,
        "tags": {"amenity": "pub", "name": "Real Pub", "dog": "yes", "wheelchair": "no",
                 "real_ale": "yes", "addr:street": "Fake St", "addr:housenumber": "1"},
    }
    pub = import_osm.element_to_pub(el)
    assert pub["dog_friendly"] == 1 and pub["accessible"] == 0 and pub["real_ale"] == 1
    assert pub["address"] == "1 Fake St" and pub["cider"] is None
    assert import_osm.element_to_pub({"type": "node", "id": 2, "lat": 1, "lon": 1, "tags": {}}) is None

    import_osm.upsert([pub])
    results = db.find_pubs(53.72, -1.86, 25)
    assert [p["name"] for p in results] == ["Real Pub"]  # demo pubs cleared

    with db.connect() as conn:
        conn.execute("UPDATE pubs SET dog_friendly = 0, cider = 1")
    import_osm.upsert([pub])  # OSM still says dog=yes, but we already know better
    p = db.find_pubs(53.72, -1.86, 25)[0]
    assert p["facilities"]["dog_friendly"] is False and p["drinks"]["cider"] is True
