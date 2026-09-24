"""
s01b_refilter_existing.py
─────────────────────────
Apply the multi-stage geometry filter to already-processed large_buildings_*.gpkg
files WITHOUT re-downloading raw data.

Stages
  1. Area bounds       100,000 – 1,000,000 sqft
  2. Compactness       (4π·area)/perimeter² ≥ 0.10
  3. BBox fill ratio   polygon_area / bbox_area ≥ 0.30
  4. Aspect ratio      max(w/h, h/w) ≤ 10.0
  5. Building class    drop residential / agricultural / unknown

Each .gpkg is overwritten in-place.  building_id values are preserved.

Run:
    pipeline/venv/bin/python pipeline/scripts/s01b_refilter_existing.py
    # or a single state:
    pipeline/venv/bin/python pipeline/scripts/s01b_refilter_existing.py TX CA
"""

import math
import sys
import logging
from pathlib import Path

import geopandas as gpd
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import DATA_PROC
from scripts.s01_download_footprints import (
    AREA_CRS,
    ROOF_AREA_MIN_SQFT,
    ROOF_AREA_MAX_SQFT,
    COMPACTNESS_MIN,
    BBOX_FILL_MIN,
    ASPECT_RATIO_MAX,
    KEEP_BUILDING_CLASSES,
    DROP_BUILDING_CLASSES,
    _log_step,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def refilter(gpkg_path: Path) -> dict:
    """Load, filter, overwrite one gpkg. Returns stats dict."""
    state_abbr = gpkg_path.stem.replace("large_buildings_", "")
    gdf = gpd.read_file(gpkg_path)
    n_raw = len(gdf)

    if n_raw == 0:
        log.warning(f"[{state_abbr}] Empty file, skipping.")
        return {"state": state_abbr, "before": 0, "after": 0, "removed": 0}

    # Project to equal-area for geometry metrics
    gdf_m = gdf.to_crs(AREA_CRS)
    area_m2  = gdf_m.geometry.area
    perim_m  = gdf_m.geometry.length.clip(lower=1)
    bounds   = gdf_m.geometry.bounds
    bbox_w   = (bounds["maxx"] - bounds["minx"]).clip(lower=1)
    bbox_h   = (bounds["maxy"] - bounds["miny"]).clip(lower=1)
    bbox_area = bbox_w * bbox_h

    gdf["roof_area_sqft"] = (area_m2 * 10.7639).round(0).astype(int)
    gdf["_compactness"]   = (4 * math.pi * area_m2) / perim_m ** 2
    gdf["_bbox_fill"]     = area_m2 / bbox_area
    gdf["_aspect_ratio"]  = bbox_w.combine(bbox_h, max) / bbox_w.combine(bbox_h, min)
    gdf["filter_reason"]  = ""

    # Stage 1 — area
    gdf.loc[gdf["roof_area_sqft"] < ROOF_AREA_MIN_SQFT, "filter_reason"] = "too_small"
    gdf.loc[
        (gdf["filter_reason"] == "") & (gdf["roof_area_sqft"] > ROOF_AREA_MAX_SQFT),
        "filter_reason"
    ] = "too_large"
    s1 = gdf[gdf["filter_reason"] == ""]
    _log_step(state_abbr, "Stage 1 — area bounds", n_raw, len(s1))

    # Stage 2 — compactness
    gdf.loc[
        (gdf["filter_reason"] == "") & (gdf["_compactness"] < COMPACTNESS_MIN),
        "filter_reason"
    ] = "low_compactness"
    s2 = gdf[gdf["filter_reason"] == ""]
    _log_step(state_abbr, "Stage 2 — compactness", len(s1), len(s2))

    # Stage 3 — bbox fill
    gdf.loc[
        (gdf["filter_reason"] == "") & (gdf["_bbox_fill"] < BBOX_FILL_MIN),
        "filter_reason"
    ] = "low_bbox_fill"
    s3 = gdf[gdf["filter_reason"] == ""]
    _log_step(state_abbr, "Stage 3 — bbox fill", len(s2), len(s3))

    # Stage 4 — aspect ratio
    gdf.loc[
        (gdf["filter_reason"] == "") & (gdf["_aspect_ratio"] > ASPECT_RATIO_MAX),
        "filter_reason"
    ] = "extreme_aspect_ratio"
    s4 = gdf[gdf["filter_reason"] == ""]
    _log_step(state_abbr, "Stage 4 — aspect ratio", len(s3), len(s4))

    # Stage 5 — building class (only meaningful if class data is real)
    if "building_class" in gdf.columns:
        gdf.loc[
            (gdf["filter_reason"] == "") &
            gdf["building_class"].isin(DROP_BUILDING_CLASSES) &
            ~gdf["building_class"].isin(KEEP_BUILDING_CLASSES),
            "filter_reason"
        ] = "bad_building_class"
    s5 = gdf[gdf["filter_reason"] == ""]
    _log_step(state_abbr, "Stage 5 — building class", len(s4), len(s5))

    # Summary
    n_after = len(s5)
    removed = n_raw - n_after
    log.info(
        f"[{state_abbr}] TOTAL: {n_raw:,} → {n_after:,}  "
        f"(removed {removed:,} / {removed/n_raw*100:.1f}%)"
    )

    # Write — keep original columns + filter_reason, drop temp metrics
    out = s5.drop(columns=["_compactness", "_bbox_fill", "_aspect_ratio"])
    out.to_file(gpkg_path, driver="GPKG", layer="buildings")
    log.info(f"[{state_abbr}] Saved → {gpkg_path}")

    return {"state": state_abbr, "before": n_raw, "after": n_after, "removed": removed}


def main(states: list[str] | None = None):
    if states:
        paths = [DATA_PROC / f"large_buildings_{s}.gpkg" for s in states]
        missing = [p for p in paths if not p.exists()]
        if missing:
            log.error("Files not found: %s", missing)
            sys.exit(1)
    else:
        paths = sorted(DATA_PROC.glob("large_buildings_*.gpkg"))

    if not paths:
        log.error("No large_buildings_*.gpkg files found in %s", DATA_PROC)
        sys.exit(1)

    log.info(f"Re-filtering {len(paths)} state file(s) ...")
    stats = [refilter(p) for p in paths]

    # ── Final summary table ───────────────────────────────────────────────────
    total_before = sum(s["before"] for s in stats)
    total_after  = sum(s["after"]  for s in stats)
    total_removed = total_before - total_after

    print("\n" + "=" * 52)
    print(f"{'STATE':<8} {'BEFORE':>8} {'AFTER':>8} {'REMOVED':>8} {'%':>6}")
    print("-" * 52)
    for s in stats:
        pct = s["removed"] / s["before"] * 100 if s["before"] else 0
        print(f"{s['state']:<8} {s['before']:>8,} {s['after']:>8,} {s['removed']:>8,} {pct:>5.1f}%")
    print("=" * 52)
    print(f"{'TOTAL':<8} {total_before:>8,} {total_after:>8,} {total_removed:>8,} "
          f"{total_removed/total_before*100:>5.1f}%")
    print("=" * 52 + "\n")


if __name__ == "__main__":
    states = sys.argv[1:] or None
    main(states)
