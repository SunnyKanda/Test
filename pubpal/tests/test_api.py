"""End-to-end tests for the PHP API, run with PHP's built-in server.

    python -m pytest -q tests                       # SQLite
    PUBPAL_TEST_MYSQL=1 python -m pytest -q tests   # also MySQL/MariaDB (needs a local server, root over socket)
"""

import json
import os
import shutil
import socket
import subprocess
import time

import httpx
import pytest

SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "site")
CENTRE = {"lat": 53.7245, "lng": -1.8616}
PASSWORD = "correct horse"

OVERPASS_FIXTURE = {
    "elements": [
        {"type": "node", "id": 1, "lat": 53.7250, "lon": -1.8610,
         "tags": {"amenity": "pub", "name": "Real Pub", "dog": "yes", "wheelchair": "no", "real_ale": "yes",
                  "addr:housenumber": "1", "addr:street": "Fake St", "addr:postcode": "HX1 1AA"}},
        {"type": "way", "id": 2, "center": {"lat": 53.7260, "lon": -1.8620},
         "tags": {"amenity": "pub", "name": "Way Pub", "sport": "billiards"}},
        {"type": "node", "id": 3, "lat": 53.7, "lon": -1.8, "tags": {"amenity": "pub"}},  # no name: skipped
    ]
}


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_php(docroot, env):
    port = free_port()
    proc = subprocess.Popen(["php", "-S", f"127.0.0.1:{port}", "-t", docroot],
                            env={**os.environ, **env}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            socket.create_connection(("127.0.0.1", port), timeout=0.1).close()
            return proc, f"http://127.0.0.1:{port}"
        except OSError:
            time.sleep(0.05)
    proc.kill()
    raise RuntimeError("PHP server didn't start")


def mysql(sql):
    subprocess.run(["mysql", "-uroot", "-e", sql], check=True)


BACKENDS = ["sqlite"] + (["mysql"] if os.environ.get("PUBPAL_TEST_MYSQL") else [])


@pytest.fixture(params=BACKENDS)
def api(request, tmp_path):
    site = tmp_path / "site"
    shutil.copytree(SITE, site)
    env = {}
    if request.param == "mysql":
        mysql("DROP DATABASE IF EXISTS pubpal_test; CREATE DATABASE pubpal_test;"
              "CREATE USER IF NOT EXISTS 'pubpal'@'localhost' IDENTIFIED BY 'pw';"
              "GRANT ALL ON pubpal_test.* TO 'pubpal'@'localhost';")
        (site / "config.php").write_text(
            "<?php return ['mysql' => ['host' => 'localhost', 'name' => 'pubpal_test', 'user' => 'pubpal', 'pass' => 'pw']];")

    # A second PHP server stands in for OpenStreetMap's Overpass API.
    fake = tmp_path / "overpass"
    fake.mkdir()
    (fake / "index.php").write_text("<?php header('Content-Type: application/json'); echo file_get_contents(__DIR__ . '/data.json');")
    (fake / "data.json").write_text(json.dumps(OVERPASS_FIXTURE))
    osm_proc, osm_url = start_php(str(fake), {})
    env["PUBPAL_OVERPASS_URL"] = osm_url + "/index.php"

    proc, base = start_php(str(site), env)
    client = httpx.Client(base_url=base + "/api.php", timeout=30)
    client.post("", params={"action": "admin_setup"}, json={"password": PASSWORD})
    client.headers["X-Admin-Password"] = PASSWORD
    client.post("", params={"action": "admin_demo"})
    yield client
    client.close()
    proc.kill()
    osm_proc.kill()


def get(client, action, **params):
    return client.get("", params={"action": action, **params})


def post(client, action, body=None, **params):
    return client.post("", params={"action": action, **params}, json=body if body is not None else {})


def pubs(client, **params):
    r = get(client, "pubs", **{**CENTRE, **params})
    assert r.status_code == 200, r.text
    return r.json()["results"]


def test_radius_search_sorted_by_distance(api):
    near, far = pubs(api, radius_km=1), pubs(api, radius_km=10)
    assert 0 < len(near) < len(far)
    assert all(p["distance_km"] <= 1 for p in near)
    assert [p["distance_km"] for p in far] == sorted(p["distance_km"] for p in far)
    assert far[0]["is_demo"] is True and isinstance(far[0]["facilities"]["dog_friendly"], bool)


def test_filters_require_yes(api):
    found = pubs(api, radius_km=25, has="dog_friendly,cider")
    assert found and all(p["facilities"]["dog_friendly"] and p["drinks"]["cider"] for p in found)


def test_bad_search_input(api):
    assert get(api, "pubs", **CENTRE, has="karaoke").status_code == 400
    assert get(api, "pubs", **CENTRE, radius_km=100).status_code == 422
    assert get(api, "pubs", lat="abc", lng=1).status_code == 422
    assert get(api, "nope").status_code == 404


def test_pub_detail(api):
    pub = pubs(api)[0]
    assert get(api, "pub", id=pub["id"]).json()["name"] == pub["name"]
    assert get(api, "pub", id=999999).status_code == 404


def test_edit_applies_only_after_approval(api):
    pub = pubs(api, radius_km=25)[0]
    r = post(api, "suggest_edit", {"flags": {"pool_table": not pub["facilities"]["pool_table"]}, "note": "Got a new table"}, id=pub["id"])
    assert r.status_code == 201, r.text
    assert get(api, "pub", id=pub["id"]).json()["facilities"]["pool_table"] == pub["facilities"]["pool_table"]

    pending = get(api, "admin_suggestions").json()["suggestions"]
    assert len(pending) == 1 and pending[0]["note"] == "Got a new table"
    assert post(api, "admin_resolve", id=pending[0]["id"], decision="approve").status_code == 200
    assert get(api, "pub", id=pub["id"]).json()["facilities"]["pool_table"] is (not pub["facilities"]["pool_table"])
    assert get(api, "admin_suggestions").json()["suggestions"] == []
    assert post(api, "admin_resolve", id=pending[0]["id"], decision="approve").status_code == 404


def test_new_pub_suggestion(api):
    body = {"name": "The New One", "lat": 53.7250, "lng": -1.8600, "flags": {"cider": True}}
    sid = post(api, "suggest_pub", body).json()["id"]
    post(api, "admin_resolve", id=sid, decision="approve")
    new = [p for p in pubs(api, radius_km=1) if p["name"] == "The New One"]
    assert new and new[0]["drinks"]["cider"] is True and new[0]["drinks"]["lager"] is None


def test_rejected_suggestion_changes_nothing(api):
    pub = pubs(api)[0]
    sid = post(api, "suggest_edit", {"name": "Vandalised"}, id=pub["id"]).json()["id"]
    post(api, "admin_resolve", id=sid, decision="reject")
    assert get(api, "pub", id=pub["id"]).json()["name"] == pub["name"]


def test_suggestion_validation(api):
    pub_id = pubs(api)[0]["id"]
    assert post(api, "suggest_pub", {"name": "No location"}).status_code == 400
    assert post(api, "suggest_edit", {"flags": {"karaoke": True}}, id=pub_id).status_code == 400
    assert post(api, "suggest_edit", {"flags": {"cider": "yes"}}, id=pub_id).status_code == 422
    assert post(api, "suggest_edit", {}, id=pub_id).status_code == 400
    assert post(api, "suggest_edit", {"name": "x" * 500}, id=pub_id).status_code == 422
    assert post(api, "suggest_edit", {"name": "x"}, id=999999).status_code == 404
    assert get(api, "suggest_edit", id=pub_id).status_code == 405


def test_admin_password(api):
    assert get(api, "admin_status").json()["password_set"] is True
    anon = httpx.Client(base_url=str(api.base_url), timeout=30)
    assert anon.get("", params={"action": "admin_suggestions"}).status_code == 401
    assert anon.get("", params={"action": "admin_suggestions"}, headers={"X-Admin-Password": "nope"}).status_code == 401
    assert anon.post("", params={"action": "admin_demo"}).status_code == 401
    # Once set, nobody can set the password again.
    assert anon.post("", params={"action": "admin_setup"}, json={"password": "takeover123"}).status_code == 403


def test_import_from_osm(api):
    r = post(api, "admin_import")
    assert r.status_code == 200, r.text
    assert r.json()["added"] == 2 and r.json()["pubs"] == {"total": 2, "demo": 0}  # demo pubs cleared

    real = {p["name"]: p for p in pubs(api, radius_km=5)}
    assert set(real) == {"Real Pub", "Way Pub"}
    p = real["Real Pub"]
    assert p["facilities"]["dog_friendly"] is True and p["facilities"]["accessible"] is False
    assert p["drinks"]["real_ale"] is True and p["drinks"]["cider"] is None
    assert get(api, "pub", id=p["id"]).json()["address"] == "1 Fake St"
    assert real["Way Pub"]["facilities"]["pool_table"] is True

    # An approved correction survives a re-import even though OSM still says dog=yes.
    sid = post(api, "suggest_edit", {"flags": {"dog_friendly": False, "cider": True}}, id=p["id"]).json()["id"]
    post(api, "admin_resolve", id=sid, decision="approve")
    r = post(api, "admin_import").json()
    assert r["added"] == 0 and r["updated"] == 2
    again = get(api, "pub", id=p["id"]).json()
    assert again["facilities"]["dog_friendly"] is False and again["drinks"]["cider"] is True


def test_private_files_not_served(api):
    # PHP's built-in server ignores .htaccess, so check the files exist that block these on SiteGround (Apache).
    for path in ["lib/.htaccess", "data/.htaccess"]:
        assert open(os.path.join(SITE, path)).read().strip() == "Require all denied"
    assert "config.php" in open(os.path.join(SITE, ".htaccess")).read()
