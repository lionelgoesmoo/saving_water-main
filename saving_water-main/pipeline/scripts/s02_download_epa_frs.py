"""
Step 2: Fetch industrial/commercial facilities that likely have cooling towers
        using the OSM Overpass API — free, no auth, returns name + coordinates.

Queries for: hospitals, hotels, power plants, industrial sites, data centres,
             manufacturing facilities, and refineries within each target state.

Output: data/processed/industrial_facilities_{STATE}.csv
"""

import sys
import time
import logging
from pathlib import Path

import requests
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import TARGET_STATES, DATA_PROC, STATE_BBOXES

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

OVERPASS_URL   = "https://overpass-api.de/api/interpreter"
REQUEST_DELAY  = 3    # seconds between queries (be polite to Overpass)
TIMEOUT        = 120  # seconds per query
MAX_RETRIES    = 3    # retries on 429 / 504
RETRY_BACKOFF  = [10, 25, 60]  # wait seconds for retry 1, 2, 3

# OSM state area tags (ISO 3166-2 codes)
STATE_ISO = {
    "TX": "US-TX", "CA": "US-CA", "NY": "US-NY", "AZ": "US-AZ",
    "PA": "US-PA", "AL": "US-AL", "CO": "US-CO", "MO": "US-MO",
    "MT": "US-MT", "NM": "US-NM", "NC": "US-NC", "OH": "US-OH",
    "OK": "US-OK", "UT": "US-UT", "VA": "US-VA", "WA": "US-WA",
    "AR": "US-AR", "ID": "US-ID", "IA": "US-IA", "NV": "US-NV",
    "OR": "US-OR", "TN": "US-TN",
}

# OSM tag sets that reliably indicate cooling tower presence
# Format: (osm_key, osm_value, confidence, naics_desc)
COOLING_TOWER_TAGS = [
    ("amenity",   "hospital",     0.90, "Hospital"),
    ("tourism",   "hotel",        0.80, "Hotel"),
    ("power",     "plant",        0.98, "Power Plant"),
    ("industrial","refinery",     0.98, "Petroleum Refinery"),
    ("industrial","manufacturing",0.75, "Manufacturing"),
    ("industrial","steel",        0.92, "Steel Mill"),
    ("telecom",   "data_center",  0.85, "Data Center"),
    ("building",  "data_center",  0.85, "Data Center"),
    ("man_made",  "cooling_tower",1.00, "Cooling Tower (direct)"),
]


def build_overpass_query(iso_state: str, osm_key: str, osm_value: str,
                         bbox: tuple) -> str:
    min_lon, min_lat, max_lon, max_lat = bbox
    bb = f"{min_lat},{min_lon},{max_lat},{max_lon}"
    return f"""
[out:json][timeout:{TIMEOUT}];
(
  node["{osm_key}"="{osm_value}"]({bb});
  way["{osm_key}"="{osm_value}"]({bb});
  relation["{osm_key}"="{osm_value}"]({bb});
);
out center tags;
"""


def parse_element(el: dict, confidence: float, naics_desc: str) -> dict | None:
    """Extract lat/lon and tags from an OSM element."""
    tags = el.get("tags", {})

    if el["type"] == "node":
        lat, lon = el.get("lat"), el.get("lon")
    elif el["type"] in ("way", "relation"):
        center = el.get("center", {})
        lat, lon = center.get("lat"), center.get("lon")
    else:
        return None

    if lat is None or lon is None:
        return None

    name    = tags.get("name", "")
    street  = tags.get("addr:street", "")
    housen  = tags.get("addr:housenumber", "")
    city    = tags.get("addr:city", "")
    state   = tags.get("addr:state", "")
    zipcode = tags.get("addr:postcode", "")

    address = " ".join(filter(None, [housen, street])).strip()
    full    = ", ".join(filter(None, [address, city, state, zipcode]))

    return {
        "osm_id":                   el["id"],
        "facility_name":            name,
        "address_street":           address,
        "city":                     city,
        "state":                    state,
        "zip":                      zipcode,
        "full_address":             full,
        "latitude":                 lat,
        "longitude":                lon,
        "naics_desc":               naics_desc,
        "cooling_tower_confidence": confidence,
    }


def fetch_facilities_osm(state_abbr: str) -> pd.DataFrame:
    bbox = STATE_BBOXES.get(state_abbr)
    if bbox is None:
        raise ValueError(f"No bounding box for {state_abbr}")

    all_rows = []
    seen_ids = set()

    log.info(f"[{state_abbr}] Querying OSM Overpass for {len(COOLING_TOWER_TAGS)} facility types ...")

    for osm_key, osm_value, confidence, desc in COOLING_TOWER_TAGS:
        query = build_overpass_query(STATE_ISO.get(state_abbr, ""), osm_key, osm_value, bbox)

        elements = []
        for attempt in range(MAX_RETRIES):
            try:
                resp = requests.post(OVERPASS_URL, data={"data": query}, timeout=TIMEOUT + 10)
                resp.raise_for_status()
                elements = resp.json().get("elements", [])
                break  # success
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    wait = RETRY_BACKOFF[attempt]
                    log.warning(f"  [{state_abbr}] {osm_key}={osm_value} failed (attempt {attempt+1}): {e} — retrying in {wait}s")
                    time.sleep(wait)
                else:
                    log.warning(f"  [{state_abbr}] {osm_key}={osm_value} failed after {MAX_RETRIES} attempts, skipping.")
                    time.sleep(REQUEST_DELAY)
        if not elements and attempt == MAX_RETRIES - 1:
            continue

        new = 0
        for el in elements:
            if el["id"] in seen_ids:
                continue
            seen_ids.add(el["id"])
            row = parse_element(el, confidence, desc)
            if row:
                all_rows.append(row)
                new += 1

        log.info(f"  {osm_key}={osm_value} ({desc}): {new} new facilities")
        time.sleep(REQUEST_DELAY)

    if not all_rows:
        log.warning(f"[{state_abbr}] No facilities found via OSM.")
        return pd.DataFrame()

    df = pd.DataFrame(all_rows)
    df["latitude"]  = pd.to_numeric(df["latitude"],  errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df = df.dropna(subset=["latitude", "longitude"])

    log.info(f"[{state_abbr}] Total unique cooling-tower facilities: {len(df):,}")
    return df


def save(df: pd.DataFrame, state_abbr: str) -> Path:
    out = DATA_PROC / f"industrial_facilities_{state_abbr}.csv"
    df.to_csv(out, index=False)
    log.info(f"[{state_abbr}] Saved {len(df):,} facilities → {out}")
    return out


def run(states: dict = None):
    states = states or TARGET_STATES
    for _, state_abbr in states.items():
        out_path = DATA_PROC / f"industrial_facilities_{state_abbr}.csv"
        if out_path.exists():
            log.info(f"[{state_abbr}] Output already exists, skipping.")
            continue
        df = fetch_facilities_osm(state_abbr)
        save(df, state_abbr)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        abbrs = set(sys.argv[1:])
        states = {k: v for k, v in TARGET_STATES.items() if v in abbrs}
    else:
        states = TARGET_STATES
    run(states)
