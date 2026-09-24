"""
Step 1: Load Microsoft Building Footprints from locally downloaded files,
        filter to buildings > 100,000 sqft, and save as GeoPackage.

Place your downloaded state files in:  pipeline/data/raw/
Accepted filenames (any of these work):
  - Texas.geojsonl.zip   ← preferred (line-delimited GeoJSON zip)
  - Texas.geojsonl
  - Texas.geojson
  - Texas.gpkg
  - texas.geojsonl.zip   ← lowercase also works

If a state file is not found locally, falls back to querying Overture Maps via DuckDB.

Output: data/processed/large_buildings_{STATE}.gpkg
"""

import sys
import json
import math
import zipfile
import logging
from pathlib import Path

import geopandas as gpd
import pandas as pd
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    TARGET_STATES,
    STATE_ABBR_TO_NAME,
    ROOF_AREA_MIN_SQFT,
    DATA_RAW,
    DATA_PROC,
    STATE_BBOXES,
    OVERTURE_RELEASE,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

AREA_CRS = "EPSG:5070"  # NAD83 Conus Albers — equal-area for accurate sqft

# Overture building classes to keep when falling back
TARGET_CLASSES = (
    "commercial", "industrial", "office", "warehouse",
    "retail", "hospital", "hotel", "manufacturing",
    "civic", "government", "school", "university",
    "transportation", "storage",
)


# ── Local file loader ───────────────────────────────────────────────���──────────

def find_local_file(state_name: str) -> Path | None:
    """
    Look for a Microsoft Building Footprints file for this state in data/raw/.
    Tries multiple filename patterns (mixed case, with/without zip).
    """
    # normalised variants: original, lowercase, no-underscore, no-space
    nospace = state_name.replace("_", "").replace(" ", "")
    nounderscore = state_name.replace("_", " ")
    candidates = [
        f"{state_name}.geojsonl.zip",
        f"{state_name}.geojsonl",
        f"{state_name}.geojson",
        f"{state_name}.gpkg",
        f"{state_name.lower()}.geojsonl.zip",
        f"{state_name.lower()}.geojsonl",
        f"{state_name.lower()}.geojson",
        f"{nounderscore}.geojsonl.zip",
        f"{nounderscore}.geojsonl",
        f"{nounderscore}.geojson",
        f"{nospace}.geojsonl.zip",
        f"{nospace}.geojsonl",
        f"{nospace}.geojson",
    ]
    for name in candidates:
        path = DATA_RAW / name
        if path.exists():
            log.info(f"Found local file: {path}")
            return path
    return None





def load_local_file(file_path: Path, state_abbr: str) -> gpd.GeoDataFrame:
    """
    Load a local building footprints file.
    - Small files (<500MB): read all at once with pyogrio (fast).
    - Large files (>=500MB): chunk-read with pyogrio to keep memory manageable.
    Works for .zip, .geojsonl, .geojson, .gpkg — no fiona/GDAL install needed.
    """
    size_mb = file_path.stat().st_size / (1024 ** 2)
    suffix  = "".join(file_path.suffixes).lower()
    log.info(f"[{state_abbr}] Reading {file_path.name} ({size_mb:.0f} MB) ...")

    # ── Unzip if needed ──────────────────────────────────────────────────────
    if suffix in (".geojsonl.zip", ".geojson.zip", ".zip"):
        import tempfile, shutil
        with zipfile.ZipFile(file_path) as zf:
            inner = next(
                (n for n in zf.namelist()
                 if n.endswith(".geojsonl") or n.endswith(".geojson")),
                None
            )
            if inner is None:
                raise ValueError(f"No GeoJSON file inside {file_path}")
            tmp_dir  = Path(tempfile.mkdtemp())
            tmp_path = tmp_dir / inner
            log.info(f"  Extracting {inner} ...")
            zf.extract(inner, tmp_dir)
        try:
            gdf = _read_and_filter(tmp_path, state_abbr, size_mb)
        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        return gdf

    return _read_and_filter(file_path, state_abbr, size_mb)


LARGE_FILE_MB   = 500    # files above this use chunked reading
PYOGRIO_CHUNK   = 50_000 # rows per chunk for large files


def _read_and_filter(file_path: Path, state_abbr: str, size_mb: float) -> gpd.GeoDataFrame:
    """Read a vector file and keep only buildings > ROOF_AREA_MIN_SQFT."""
    if size_mb < LARGE_FILE_MB:
        # Small file — read everything at once (pyogrio is fast)
        gdf = gpd.read_file(file_path, engine="pyogrio")
        log.info(f"[{state_abbr}] Loaded {len(gdf):,} total buildings.")
        return _area_filter(gdf, state_abbr)
    else:
        # Large file — stream in chunks via pyogrio
        import pyogrio
        info       = pyogrio.read_info(str(file_path))
        total_feat = info.get("features", "?")
        log.info(f"[{state_abbr}] Large file ({size_mb:.0f} MB, ~{total_feat} features). "
                 f"Reading in chunks of {PYOGRIO_CHUNK:,} ...")
        kept   = []
        offset = 0
        while True:
            chunk = gpd.read_file(
                file_path, engine="pyogrio",
                rows=slice(offset, offset + PYOGRIO_CHUNK)
            )
            if len(chunk) == 0:
                break
            filtered = _area_filter(chunk, state_abbr, quiet=True)
            if len(filtered):
                kept.append(filtered)
            offset += PYOGRIO_CHUNK
            if offset % 500_000 == 0:
                log.info(f"  scanned {offset:,} | kept {sum(len(k) for k in kept):,}")

        if not kept:
            raise ValueError("No buildings passed the 100,000 sqft filter.")
        result = pd.concat(kept, ignore_index=True)
        result = gpd.GeoDataFrame(result, geometry="geometry", crs="EPSG:4326")
        log.info(f"[{state_abbr}] Kept {len(result):,} large buildings from {offset:,} total.")
        return result


def _area_filter(gdf: gpd.GeoDataFrame, state_abbr: str, quiet: bool = False) -> gpd.GeoDataFrame:
    """Project to equal-area CRS, compute sqft, filter."""
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    gdf_m = gdf.to_crs("EPSG:5070")
    gdf["roof_area_sqft"] = (gdf_m.geometry.area * 10.7639).round(0).astype(int)
    result = gdf[gdf["roof_area_sqft"] >= ROOF_AREA_MIN_SQFT].copy()
    if not quiet:
        log.info(f"[{state_abbr}] Loaded {len(gdf):,} buildings from local file.")
    return result


# ── Overture Maps fallback ─────────────────────────���───────────────────────────

def query_overture_fallback(state_abbr: str) -> gpd.GeoDataFrame:
    """
    Fallback: query Overture Maps via DuckDB when no local file is found.
    Already filters to commercial/industrial classes AND area > threshold.
    """
    try:
        import duckdb
        from shapely import wkt as shapely_wkt
    except ImportError:
        raise ImportError("pip install duckdb")

    bbox = STATE_BBOXES.get(state_abbr)
    if bbox is None:
        raise ValueError(f"No bounding box defined for {state_abbr}")

    min_lon, min_lat, max_lon, max_lat = bbox
    classes_sql = ", ".join(f"'{c}'" for c in TARGET_CLASSES)
    s3_path = (
        f"s3://overturemaps-us-west-2/release/{OVERTURE_RELEASE}"
        "/theme=buildings/type=building/*"
    )

    query = f"""
    INSTALL spatial; LOAD spatial; INSTALL httpfs; LOAD httpfs;
    SET s3_region='us-west-2';
    SELECT
        id,
        class,
        CAST(names     AS JSON) AS names_json,
        CAST(addresses AS JSON) AS addresses_json,
        ST_AsText(geometry)     AS geom_wkt,
        ST_Area(ST_Transform(geometry,'EPSG:4326','EPSG:5070')) * 10.7639 AS roof_area_sqft
    FROM read_parquet('{s3_path}', hive_partitioning=1)
    WHERE bbox.xmin >= {min_lon} AND bbox.xmax <= {max_lon}
      AND bbox.ymin >= {min_lat} AND bbox.ymax <= {max_lat}
      AND class IN ({classes_sql})
      AND ST_Area(ST_Transform(geometry,'EPSG:4326','EPSG:5070')) * 10.7639 >= {ROOF_AREA_MIN_SQFT}
    ;
    """

    log.info(f"[{state_abbr}] No local file — querying Overture Maps S3 (2–5 min) ...")
    con = duckdb.connect()
    try:
        df = con.execute(query).df()
    finally:
        con.close()

    df["geometry"] = df["geom_wkt"].apply(shapely_wkt.loads)
    gdf = gpd.GeoDataFrame(df, geometry="geometry", crs="EPSG:4326")
    gdf["building_class"] = df["class"].fillna("commercial")

    def _parse_name(j):
        try:
            d = json.loads(j) if j and j not in ("null",) else {}
            return d.get("primary", "") if isinstance(d, dict) else ""
        except Exception:
            return ""

    def _parse_addr(j):
        try:
            d = json.loads(j) if j and j not in ("null", "[]") else []
            a = d[0] if isinstance(d, list) and d else (d if isinstance(d, dict) else {})
            return ", ".join(filter(None, [a.get("freeform",""), a.get("locality",""),
                                           a.get("region",""), a.get("postcode","")]))
        except Exception:
            return ""

    gdf["fac_name"]    = df["names_json"].apply(_parse_name)
    gdf["fac_address"] = df["addresses_json"].apply(_parse_addr)
    log.info(f"[{state_abbr}] Overture returned {len(gdf):,} large buildings.")
    return gdf


# ── Filter + standardise ──────────────────────────────���────────────────────────

# ── Filter thresholds ─────────────────────────────────────────────────────────
ROOF_AREA_MAX_SQFT   = 1_000_000   # land parcels / farms above this
COMPACTNESS_MIN      = 0.10        # (4π·area)/perimeter² — circles=1, spiky shapes→0
BBOX_FILL_MIN        = 0.30        # polygon area / bounding-box area
ASPECT_RATIO_MAX     = 10.0        # width:height or height:width
KEEP_BUILDING_CLASSES = {
    "commercial", "industrial", "warehouse", "retail", "office",
    "hospital", "hotel", "manufacturing", "civic", "government",
    "school", "university", "transportation", "storage",
}
DROP_BUILDING_CLASSES = {"residential", "agricultural", "unknown"}


def _log_step(state_abbr: str, label: str, before: int, after: int) -> None:
    removed = before - after
    pct = removed / before * 100 if before else 0
    log.info(f"[{state_abbr}] {label}: {before:,} → {after:,}  (−{removed:,} / {pct:.1f}%)")


def filter_and_standardise(gdf: gpd.GeoDataFrame, state_abbr: str) -> gpd.GeoDataFrame:
    """
    Multi-stage filtering to remove non-building polygons (farms, land, lakes).
    All geometry work is done in EPSG:5070 (equal-area metres).
    """
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")

    # Project once to equal-area for all geometry metrics
    gdf_m = gdf.to_crs(AREA_CRS)
    n_raw = len(gdf_m)
    log.info(f"[{state_abbr}] Raw polygons: {n_raw:,}")

    # Pre-compute geometry metrics (vectorised — fast)
    area_m2   = gdf_m.geometry.area
    perim_m   = gdf_m.geometry.length
    bounds    = gdf_m.geometry.bounds                          # minx miny maxx maxy
    bbox_w    = (bounds["maxx"] - bounds["minx"]).clip(lower=1)
    bbox_h    = (bounds["maxy"] - bounds["miny"]).clip(lower=1)
    bbox_area = bbox_w * bbox_h

    gdf["roof_area_sqft"] = (area_m2 * 10.7639).round(0).astype(int)
    gdf["_compactness"]   = (4 * math.pi * area_m2) / perim_m.clip(lower=1) ** 2
    gdf["_bbox_fill"]     = area_m2 / bbox_area
    gdf["_aspect_ratio"]  = (bbox_w / bbox_h).combine(bbox_h / bbox_w, max)
    gdf["filter_reason"]  = ""

    # ── Stage 1: Area bounds ──────────────────────────────────────────────────
    n0 = len(gdf)
    gdf.loc[gdf["roof_area_sqft"] < ROOF_AREA_MIN_SQFT,  "filter_reason"] = "too_small"
    gdf.loc[gdf["roof_area_sqft"] > ROOF_AREA_MAX_SQFT,  "filter_reason"] = "too_large"
    passed = gdf[gdf["filter_reason"] == ""].copy()
    _log_step(state_abbr, "Stage 1 — area bounds", n0, len(passed))

    # ── Stage 2: Compactness (spiky / irregular shapes) ───────────────────────
    n1 = len(passed)
    passed.loc[passed["_compactness"] < COMPACTNESS_MIN, "filter_reason"] = "low_compactness"
    passed = passed[passed["filter_reason"] == ""].copy()
    _log_step(state_abbr, "Stage 2 — compactness", n1, len(passed))

    # ── Stage 3: Bounding-box fill (sparse / L-shaped land) ──────────────────
    n2 = len(passed)
    passed.loc[passed["_bbox_fill"] < BBOX_FILL_MIN, "filter_reason"] = "low_bbox_fill"
    passed = passed[passed["filter_reason"] == ""].copy()
    _log_step(state_abbr, "Stage 3 — bbox fill", n2, len(passed))

    # ── Stage 4: Aspect ratio (extreme elongation) ────────────────────────────
    n3 = len(passed)
    passed.loc[passed["_aspect_ratio"] > ASPECT_RATIO_MAX, "filter_reason"] = "extreme_aspect_ratio"
    passed = passed[passed["filter_reason"] == ""].copy()
    _log_step(state_abbr, "Stage 4 — aspect ratio", n3, len(passed))

    # ── Stage 5: Building class filter ───────────────────────────────────────
    if "building_class" in passed.columns:
        n4 = len(passed)
        bad_class = (
            passed["building_class"].isin(DROP_BUILDING_CLASSES) &
            ~passed["building_class"].isin(KEEP_BUILDING_CLASSES)
        )
        passed.loc[bad_class, "filter_reason"] = "bad_building_class"
        passed = passed[passed["filter_reason"] == ""].copy()
        _log_step(state_abbr, "Stage 5 — building class", n4, len(passed))

    # ── Summary ───────────────────────────────────────────────────────────────
    total_removed = n_raw - len(passed)
    log.info(
        f"[{state_abbr}] TOTAL: {n_raw:,} → {len(passed):,}  "
        f"(removed {total_removed:,} / {total_removed/n_raw*100:.1f}%)"
    )

    # ── Standardise output ────────────────────────────────────────────────────
    large = passed.copy()
    large["state"] = state_abbr
    large = large.to_crs("EPSG:4326")

    centroids = large.geometry.centroid
    large["centroid_lon"] = centroids.x.round(6)
    large["centroid_lat"] = centroids.y.round(6)

    large = large.reset_index(drop=True)
    large["building_id"] = [f"{state_abbr}_{i:06d}" for i in range(len(large))]

    if "fac_name"       not in large.columns: large["fac_name"]       = ""
    if "fac_address"    not in large.columns: large["fac_address"]    = ""
    if "building_class" not in large.columns: large["building_class"] = "commercial"

    keep = ["building_id", "state", "roof_area_sqft", "building_class",
            "fac_name", "fac_address", "centroid_lon", "centroid_lat",
            "filter_reason", "geometry"]
    available = [c for c in keep if c in large.columns]
    return large[available]


def save(gdf: gpd.GeoDataFrame, state_abbr: str) -> Path:
    out = DATA_PROC / f"large_buildings_{state_abbr}.gpkg"
    gdf.to_file(out, driver="GPKG", layer="buildings")
    log.info(f"[{state_abbr}] Saved → {out}")
    return out


def run(states: dict = None):
    states = states or TARGET_STATES
    for state_name, state_abbr in states.items():
        out_path = DATA_PROC / f"large_buildings_{state_abbr}.gpkg"
        if out_path.exists():
            log.info(f"[{state_abbr}] Output already exists, skipping.")
            continue

        local_file = find_local_file(state_name)
        if local_file:
            gdf_raw = load_local_file(local_file, state_abbr)
        else:
            log.warning(
                f"[{state_abbr}] No local file found in {DATA_RAW}. "
                f"Expected e.g. '{state_name}.geojsonl.zip'. "
                "Falling back to Overture Maps query."
            )
            gdf_raw = query_overture_fallback(state_abbr)

        gdf = filter_and_standardise(gdf_raw, state_abbr)
        save(gdf, state_abbr)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        abbrs = set(sys.argv[1:])
        states = {k: v for k, v in TARGET_STATES.items() if v in abbrs}
    else:
        states = TARGET_STATES
    run(states)
