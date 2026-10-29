"""PubPal web app: find pubs near you in Halifax, West Yorkshire.

Run with:  uvicorn server:app --reload   (from the pubpal/ directory)
"""

import os
import secrets
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import db

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
MAX_RADIUS_KM = 25

app = FastAPI(title="PubPal")
db.init_db()


@app.get("/api/pubs")
def search_pubs(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(2, gt=0, le=MAX_RADIUS_KM),
    has: str = Query("", description="Comma-separated facilities/drinks the pub must have"),
):
    required = [f for f in has.split(",") if f]
    unknown = set(required) - set(db.FLAGS)
    if unknown:
        raise HTTPException(400, f"Unknown filter(s): {', '.join(sorted(unknown))}")
    return {"results": db.find_pubs(lat, lng, radius_km, required)}


@app.get("/api/pubs/{pub_id}")
def pub_detail(pub_id: int):
    pub = db.get_pub(pub_id)
    if not pub:
        raise HTTPException(404, "Pub not found")
    return pub


class Suggestion(BaseModel):
    # Only the fields being changed need to be sent. A flag of null means "don't know".
    name: Optional[str] = Field(None, max_length=120)
    address: Optional[str] = Field(None, max_length=200)
    postcode: Optional[str] = Field(None, max_length=10)
    phone: Optional[str] = Field(None, max_length=30)
    website: Optional[str] = Field(None, max_length=200)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    flags: dict[str, bool] = {}
    note: Optional[str] = Field(None, max_length=500)

    def changes(self):
        unknown = set(self.flags) - set(db.FLAGS)
        if unknown:
            raise HTTPException(400, f"Unknown field(s): {', '.join(sorted(unknown))}")
        fields = {k: v for k, v in self.model_dump(include=set(db.DETAILS) | {"lat", "lng"}).items()
                  if v not in (None, "")}
        fields.update({k: int(v) for k, v in self.flags.items()})
        return fields


@app.post("/api/pubs/{pub_id}/suggestions", status_code=201)
def suggest_edit(pub_id: int, body: Suggestion):
    if not db.get_pub(pub_id):
        raise HTTPException(404, "Pub not found")
    changes = body.changes()
    changes.pop("lat", None)
    changes.pop("lng", None)
    if not changes:
        raise HTTPException(400, "Nothing to change")
    return {"id": db.add_suggestion(pub_id, changes, body.note), "status": "pending"}


@app.post("/api/suggestions", status_code=201)
def suggest_new_pub(body: Suggestion):
    changes = body.changes()
    if not changes.get("name") or "lat" not in changes or "lng" not in changes:
        raise HTTPException(400, "A new pub needs a name and a location")
    return {"id": db.add_suggestion(None, changes, body.note), "status": "pending"}


# ─── Admin: approve or reject suggestions ─────────────────────────────────────

def require_admin(token: Optional[str]):
    expected = os.environ.get("PUBPAL_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(503, "Admin is disabled: set PUBPAL_ADMIN_TOKEN")
    if not token or not secrets.compare_digest(token, expected):
        raise HTTPException(401, "Wrong admin token")


@app.get("/api/admin/suggestions")
def admin_list(x_admin_token: Optional[str] = Header(None)):
    require_admin(x_admin_token)
    return {"suggestions": db.list_suggestions()}


@app.post("/api/admin/suggestions/{suggestion_id}/{action}")
def admin_resolve(suggestion_id: int, action: str, x_admin_token: Optional[str] = Header(None)):
    require_admin(x_admin_token)
    if action not in ("approve", "reject"):
        raise HTTPException(404, "Unknown action")
    if not db.resolve_suggestion(suggestion_id, action == "approve"):
        raise HTTPException(404, "No pending suggestion with that id")
    return {"ok": True}


@app.get("/admin")
def admin_page():
    return FileResponse(os.path.join(STATIC_DIR, "admin.html"))


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
