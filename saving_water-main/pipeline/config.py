"""
Shared configuration, static lookup tables, and constants for the RainUse Nexus pipeline.
All scripts import from here.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# ── Directories ────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
DATA_RAW   = BASE_DIR / "data" / "raw"
DATA_PROC  = BASE_DIR / "data" / "processed"
OUTPUT_DIR = BASE_DIR / "output"
TILES_DIR  = OUTPUT_DIR / "tiles"

for d in [DATA_RAW, DATA_PROC, OUTPUT_DIR, TILES_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ── Target states ──────────────────────────────────────────────────────────────
# Keys must match GeoJSON filename stem exactly (e.g. "NewYork" → NewYork.geojson)
TARGET_STATES = {
    # Original 4
    "Texas":         "TX",
    "California":    "CA",
    "Arizona":       "AZ",
    "Pennsylvania":  "PA",
    # 12 new states
    "Alabama":       "AL",
    "Colorado":      "CO",
    "Missouri":      "MO",
    "Montana":       "MT",
    "NewMexico":     "NM",
    "NewYork":       "NY",
    "NorthCarolina": "NC",
    "Ohio":          "OH",
    "Oklahoma":      "OK",
    "Utah":          "UT",
    "Virginia":      "VA",
    "Washington":    "WA",
    # 6 additional states
    "Arkansas":      "AR",
    "Idaho":         "ID",
    "Iowa":          "IA",
    "Nevada":        "NV",
    "Oregon":        "OR",
    "Tennessee":     "TN",
    # 15 more states
    "Wyoming":       "WY",
    "Wisconsin":     "WI",
    "WestVirginia":  "WV",
    "SouthDakota":   "SD",
    "SouthCarolina": "SC",
    "NorthDakota":   "ND",
    "Nebraska":      "NE",
    "Mississippi":   "MS",
    "Minnesota":     "MN",
    "Michigan":      "MI",
    "Maine":         "ME",
    "Louisiana":     "LA",
    "Kentucky":      "KY",
    "Indiana":       "IN",
    "Georgia":       "GA",
}

# Maps 2-letter code → file-stem name (for URL construction)
STATE_ABBR_TO_NAME = {v: k for k, v in TARGET_STATES.items()}

# Human-readable display names (used in state_scores.json "state" field)
STATE_DISPLAY_NAMES = {
    "TX": "Texas",
    "CA": "California",
    "AZ": "Arizona",
    "PA": "Pennsylvania",
    "AL": "Alabama",
    "CO": "Colorado",
    "MO": "Missouri",
    "MT": "Montana",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "UT": "Utah",
    "VA": "Virginia",
    "WA": "Washington",
    "AR": "Arkansas",
    "ID": "Idaho",
    "IA": "Iowa",
    "NV": "Nevada",
    "OR": "Oregon",
    "TN": "Tennessee",
}

# ── Microsoft Building Footprints ──────────────────────────────────────────────
MS_FOOTPRINTS_URL = (
    "https://usbuildingdata.blob.core.windows.net/usbuildings-v2/{state_name}.geojsonl.zip"
)
ROOF_AREA_MIN_SQFT = 100_000  # filter: buildings larger than this

# ── EPA FRS ────────────────────────────────────────────────────────────────────
EPA_FRS_BASE_URL = "https://www.epa.gov/frs/epa-frs-facilities-state-single-file-csv-download"
EPA_FRS_DOWNLOAD_URL = (
    "https://ordsext.epa.gov/FLA/www3/state_files/{state_abbr_lower}_FACILITIES.zip"
)

# NAICS prefixes (4-digit) that reliably indicate cooling tower presence
COOLING_TOWER_NAICS = {
    "2211": ("Electric Power Generation/Transmission", 0.98),
    "2212": ("Natural Gas Distribution", 0.85),
    "3241": ("Petroleum Refineries", 0.98),
    "3312": ("Steel Mills", 0.92),
    "3252": ("Resin & Synthetic Rubber Mfg", 0.88),
    "3251": ("Basic Chemical Mfg", 0.87),
    "3253": ("Pesticide/Agricultural Chemical Mfg", 0.85),
    "3559": ("Industrial Machinery Mfg", 0.82),
    "3119": ("Other Food Mfg", 0.75),
    "6221": ("General Medical & Surgical Hospitals", 0.90),
    "7211": ("Hotels & Motels (except Casino Hotels)", 0.80),
    "7212": ("Casino Hotels", 0.82),
    "5182": ("Data Processing & Hosting", 0.85),
    "5171": ("Wired Telecommunications Carriers", 0.78),
    "4931": ("Electric Bulk Power Transmission", 0.95),
    "3272": ("Glass Product Mfg from Purchased Glass", 0.80),
    "3221": ("Pulp, Paper & Paperboard Mills", 0.90),
}

# ── Water / financial rates (state-level averages) ────────────────────────────
# Source: worldpopulationreview.com/state-rankings/water-prices-by-state (2024)
# Units: $/1,000 gallons ($/kgal)
STATE_WATER_RATES = {
    "TX": 5.20,
    "CA": 9.80,
    "NY": 10.50,
    "AZ": 4.90,
    "PA": 8.30,
    "AL": 4.80,
    "CO": 5.60,
    "MO": 4.70,
    "MT": 4.50,
    "NM": 5.30,
    "NC": 5.80,
    "OH": 6.20,
    "OK": 4.60,
    "UT": 4.20,
    "VA": 7.80,
    "WA": 6.80,
    "AR": 4.40,
    "ID": 4.30,
    "IA": 5.80,
    "NV": 5.10,
    "OR": 6.40,
    "TN": 5.50,
    "WY": 4.30,
    "WI": 6.90,
    "WV": 6.50,
    "SD": 5.40,
    "SC": 6.20,
    "ND": 4.80,
    "NE": 4.70,
    "MS": 5.00,
    "MN": 6.10,
    "MI": 7.30,
    "ME": 7.60,
    "LA": 5.10,
    "KY": 5.70,
    "IN": 6.50,
    "GA": 5.60,
    # Additional states used as fallback
    "FL": 4.10,
    "IL": 7.20,
}

SEWER_RATE_MULTIPLIER    = 0.85   # sewer ≈ 85% of water cost
SEWER_DISCHARGE_FRACTION = 0.70   # fraction of harvested water avoiding sewer discharge

# ── Viability scoring weights ──────────────────────────────────────────────────
SCORE_WEIGHTS = {
    "physical":     0.25,
    "financial":    0.25,
    "regulatory":   0.20,
    "esg":          0.20,
    "climate_risk": 0.10,
}

# Pre-scored regulatory environment per state (0–100)
REGULATORY_SCORES = {
    "TX": 75,
    "CA": 85,
    "NY": 80,
    "AZ": 70,
    "PA": 82,
    "AL": 55,
    "CO": 68,
    "MO": 58,
    "MT": 52,
    "NM": 72,
    "NC": 65,
    "OH": 63,
    "OK": 60,
    "UT": 70,
    "VA": 70,
    "WA": 72,
    "AR": 58,
    "ID": 60,
    "IA": 62,
    "NV": 73,
    "OR": 70,
    "TN": 62,
    "WY": 55,
    "WI": 68,
    "WV": 52,
    "SD": 58,
    "SC": 64,
    "ND": 56,
    "NE": 60,
    "MS": 50,
    "MN": 70,
    "MI": 68,
    "ME": 72,
    "LA": 48,
    "KY": 54,
    "IN": 60,
    "GA": 62,
    "FL": 65,
    "IL": 62,
}

# Drought / climate risk index per state (0–100, higher = more urgent)
DROUGHT_INDEX = {
    "TX": 65,
    "CA": 90,
    "NY": 30,
    "AZ": 95,
    "PA": 28,
    "AL": 30,
    "CO": 72,
    "MO": 40,
    "MT": 58,
    "NM": 90,
    "NC": 38,
    "OH": 32,
    "OK": 68,
    "UT": 85,
    "VA": 35,
    "WA": 45,
    "AR": 45,
    "ID": 62,
    "IA": 42,
    "NV": 93,
    "OR": 55,
    "TN": 40,
    "WY": 70,
    "WI": 35,
    "WV": 30,
    "SD": 55,
    "SC": 38,
    "ND": 60,
    "NE": 52,
    "MS": 42,
    "MN": 38,
    "MI": 32,
    "ME": 25,
    "LA": 48,
    "KY": 36,
    "IN": 34,
    "GA": 42,
    "FL": 55,
    "IL": 35,
}

# ── Rainfall physics constants ─────────────────────────────────────────────────
RUNOFF_COEFFICIENT   = 0.85   # collection efficiency for flat commercial roofs
GALLON_PER_SQFT_INCH = 0.623  # gallons collected per sqft per inch of rain

# ── NOAA Climate Normals ───────────────────────────────────────────────────────
NOAA_NORMALS_S3   = "s3://noaa-climate-normals-pds/normals-annualseasonal/1991-2020/"
NOAA_CDO_API_BASE = "https://www.ncei.noaa.gov/cdo-web/api/v2"
NOAA_CDO_TOKEN    = os.getenv("NOAA_CDO_TOKEN", "")

# ── Census TIGER boundaries ────────────────────────────────────────────────────
CENSUS_COUNTIES_URL = (
    "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_county_500k.zip"
)
CENSUS_PLACES_URL = (
    "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_place_500k.zip"
)

# ── Overture Maps (DuckDB S3 query) ───────────────────────────────────────────
OVERTURE_RELEASE = "2024-07-22.0"
OVERTURE_S3_PATH = (
    f"s3://overturemaps-us-west-2/release/{OVERTURE_RELEASE}"
    "/theme=buildings/type=building/*"
)

# Bounding boxes [min_lon, min_lat, max_lon, max_lat]
STATE_BBOXES = {
    "TX": (-106.65, 25.84,  -93.51, 36.50),
    "CA": (-124.48, 32.53, -114.13, 42.01),
    "AZ": (-114.82, 31.33, -109.05, 37.00),
    "PA": ( -80.52, 39.72,  -74.69, 42.27),
    "AL": ( -88.47, 30.22,  -84.89, 35.01),
    "CO": (-109.06, 36.99, -102.04, 41.00),
    "MO": ( -95.77, 35.99,  -89.10, 40.61),
    "MT": (-116.05, 44.36, -104.04, 49.00),
    "NM": (-109.05, 31.33, -103.00, 37.00),
    "NY": ( -79.76, 40.50,  -71.86, 45.02),
    "NC": ( -84.32, 33.84,  -75.46, 36.59),
    "OH": ( -84.82, 38.40,  -80.52, 41.98),
    "OK": (-103.00, 33.62,  -94.43, 37.00),
    "UT": (-114.05, 36.99, -109.05, 42.00),
    "VA": ( -83.68, 36.54,  -75.24, 39.47),
    "WA": (-124.73, 45.54, -116.92, 49.00),
    "AR": ( -94.62, 33.00,  -89.64, 36.50),
    "ID": (-117.24, 41.99, -111.04, 49.00),
    "IA": ( -96.64, 40.37,  -90.14, 43.50),
    "NV": (-120.01, 35.00, -114.04, 42.00),
    "OR": (-124.57, 41.99, -116.46, 46.26),
    "TN": ( -90.31, 34.98,  -81.65, 36.68),
    "WY": (-111.06, 40.99, -104.05, 45.00),
    "WI": ( -92.89, 42.49,  -86.81, 47.31),
    "WV": ( -82.64, 37.20,  -77.72, 40.64),
    "SD": (-104.05, 42.48,  -96.44, 45.95),
    "SC": ( -83.35, 32.04,  -78.54, 35.22),
    "ND": (-104.05, 45.93,  -96.56, 49.00),
    "NE": (-104.05, 39.99,  -95.31, 43.00),
    "MS": ( -91.65, 29.62,  -88.10, 34.99),
    "MN": ( -97.24, 43.50,  -89.49, 49.38),
    "MI": ( -90.42, 41.70,  -83.28, 48.31),
    "ME": ( -71.09, 42.98,  -66.95, 47.47),
    "LA": ( -94.04, 28.93,  -88.82, 33.02),
    "KY": ( -89.57, 36.50,  -81.96, 39.15),
    "IN": ( -88.10, 37.77,  -84.80, 41.76),
    "GA": ( -85.61, 30.36,  -80.84, 35.00),
}

# ── Google Maps Static API (Step 7 — CV layer) ────────────────────────────────
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
SATELLITE_TILE_ZOOM = 18
SATELLITE_TILE_SIZE = "640x640"

# ── Output files ───────────────────────────────────────────────────────────────
BUILDINGS_JSON    = OUTPUT_DIR / "buildings.json"
STATE_SCORES_JSON = OUTPUT_DIR / "state_scores.json"
