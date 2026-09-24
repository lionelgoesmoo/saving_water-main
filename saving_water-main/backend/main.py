# main.py
import base64
import json
import logging
import os
from datetime import datetime
from pathlib import Path

import subprocess
import tempfile

import resend
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError

from models import BuildingRecord, ROIRequest, ROIResponse, BriefRequest, BriefResponse
from roi_engine import calc_scenario
from brief_generator import generate_brief
from brief_html import generate_brief_html

load_dotenv()

logger = logging.getLogger(__name__)

RESEND_API_KEY   = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM       = os.getenv("EMAIL_FROM", "Pluvial <onboarding@resend.dev>")

_CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
]

def _html_to_pdf(html: str) -> bytes:
    chrome = next((p for p in _CHROME_CANDIDATES if Path(p).exists()), None)
    if not chrome:
        raise RuntimeError("Chrome not found — install Google Chrome or set a valid path")
    with tempfile.NamedTemporaryFile(suffix=".html", mode="w", delete=False) as f:
        f.write(html)
        html_path = f.name
    pdf_path = html_path.replace(".html", ".pdf")
    try:
        subprocess.run(
            [chrome, "--headless=new", "--no-sandbox", "--disable-gpu",
             f"--print-to-pdf={pdf_path}", "--print-to-pdf-no-header",
             f"file://{html_path}"],
            capture_output=True, timeout=30, check=True,
        )
        return Path(pdf_path).read_bytes()
    finally:
        Path(html_path).unlink(missing_ok=True)
        Path(pdf_path).unlink(missing_ok=True)

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")


def get_static_map_url(lat: float, lng: float, zoom: int = 18, size: str = "640x640", maptype: str = "satellite") -> str:
    return (
        "https://maps.googleapis.com/maps/api/staticmap"
        f"?center={lat},{lng}"
        f"&zoom={zoom}"
        f"&size={size}"
        f"&maptype={maptype}"
        f"&key={GOOGLE_MAPS_API_KEY}"
    )

app = FastAPI(title="RainUSE Nexus API")

# CORS_ORIGINS env var overrides the default (comma-separated for multiple origins)
_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load once at startup — never mutate
# Drop real buildings.json into data/ to override the stub automatically
_data_file = Path("data/buildings.json") if Path("data/buildings.json").exists() else Path("data/buildings_stub.json")
logger.info("Loading buildings from %s", _data_file.resolve())
_raw = json.loads(_data_file.read_text())

BUILDINGS: dict[str, BuildingRecord] = {}
_skipped = 0
for _b in _raw:
    try:
        BUILDINGS[_b["building_id"]] = BuildingRecord(**_b)
    except Exception as _e:
        _skipped += 1
        logger.warning("Skipped building %s — validation error: %s", _b.get("building_id", "?"), _e)

logger.info("Loaded %d buildings (%d skipped)", len(BUILDINGS), _skipped)


def get_building(building_id: str) -> BuildingRecord:
    if building_id not in BUILDINGS:
        raise HTTPException(status_code=404, detail=f"Building {building_id} not found")
    return BUILDINGS[building_id]


def _inject_imagery(b: BuildingRecord) -> dict:
    data = b.model_dump()
    if GOOGLE_MAPS_API_KEY and b.lat and b.lng:
        data["imagery_url"] = get_static_map_url(b.lat, b.lng)
        data["imagery_source"] = "Google Maps Satellite"
    return data


@app.get("/buildings", response_model=list[BuildingRecord])
def list_buildings():
    return [_inject_imagery(b) for b in BUILDINGS.values()]


@app.get("/buildings/{building_id}", response_model=BuildingRecord)
def get_building_by_id(building_id: str):
    return _inject_imagery(get_building(building_id))


@app.post("/roi", response_model=ROIResponse)
def calculate_roi(req: ROIRequest):
    if req.scenario not in ("conservative", "base", "upside"):
        raise HTTPException(status_code=400, detail="scenario must be conservative, base, or upside")
    building = get_building(req.building_id)
    result = calc_scenario(building, req.scenario)
    return ROIResponse(building_id=req.building_id, scenario=req.scenario, **result)


@app.post("/brief", response_model=BriefResponse)
def generate_investment_brief(req: BriefRequest):
    building = get_building(req.building_id)
    roi_data = calc_scenario(building, "base")
    roi = ROIResponse(building_id=req.building_id, scenario="base", **roi_data)
    try:
        return generate_brief(building, roi)
    except ValidationError as e:
        logger.error("BriefResponse validation failed for %s: %s", req.building_id, str(e))
        raise HTTPException(status_code=422, detail=f"Brief schema validation failed: {str(e)}")
    except Exception as e:
        err_str = str(e)
        logger.error("Brief generation failed for %s: %s", req.building_id, err_str)
        if "503" in err_str or "UNAVAILABLE" in err_str:
            raise HTTPException(status_code=503, detail="AI model temporarily unavailable — high demand. Please retry in a moment.")
        raise HTTPException(status_code=500, detail=f"Brief generation failed: {err_str}")


# ── Email brief ───────────────────────────────────────────────────────────────

class EmailBriefRequest(BaseModel):
    building_id: str
    email: str


@app.post("/email-brief", status_code=200)
def email_investment_brief(req: EmailBriefRequest):
    if not RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Email service not configured. Set RESEND_API_KEY in .env.")

    building = get_building(req.building_id)
    roi_data = calc_scenario(building, "base")
    roi = ROIResponse(building_id=req.building_id, scenario="base", **roi_data)

    try:
        brief = generate_brief(building, roi)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Brief generation failed: {e}")

    generated_at = datetime.now().strftime("%B %-d, %Y")
    html = generate_brief_html(building, roi, brief, generated_at)

    try:
        pdf_bytes = _html_to_pdf(html)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    building_ref = building.building_id.upper()
    pdf_b64 = base64.b64encode(pdf_bytes).decode()

    resend.api_key = RESEND_API_KEY
    try:
        resend.Emails.send({
            "from": EMAIL_FROM,
            "to": [req.email],
            "subject": f"Investment Brief — {building_ref} · {building.address.split(',')[0]}",
            "html": (
                f"<p>Hi,</p>"
                f"<p>Please find attached the Pluvial AI Investment Brief for "
                f"<strong>{building.address}</strong> ({building_ref}).</p>"
                f"<p>The brief includes a full financial snapshot, ROI analysis, ESG context, "
                f"and recommended next steps.</p>"
                f"<p style='color:#64748b;font-size:12px;'>Generated {generated_at} · Pre-validation draft</p>"
            ),
            "attachments": [{
                "filename": f"Pluvial_Brief_{building_ref}.pdf",
                "content": pdf_b64,
            }],
        })
    except Exception as e:
        logger.error("Resend failed for %s → %s: %s", building_ref, req.email, e)
        raise HTTPException(status_code=502, detail=f"Email delivery failed: {e}")

    return {"sent": True, "to": req.email, "ref": building_ref}
