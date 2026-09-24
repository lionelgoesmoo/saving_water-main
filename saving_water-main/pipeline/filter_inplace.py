"""
Filter Texas.geojson and California.geojson IN-PLACE.
Keeps only buildings with roof area > 100,000 sqft.
Originals are replaced; no copy is kept after completion.

Usage:
    python filter_inplace.py
    python filter_inplace.py Texas.geojson          # single file
    python filter_inplace.py Texas.geojson California.geojson
"""

import sys
import json
import shutil
import logging
import tempfile
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import shape
from shapely.ops import transform as shp_transform
from tqdm import tqdm
import fiona
import fiona.crs

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

RAW_DIR          = Path(__file__).parent / "data" / "raw"
ROOF_AREA_MIN    = 100_000          # sqft
SRC_CRS          = "EPSG:4326"
AREA_CRS         = "EPSG:5070"      # NAD83 Conus Albers — equal-area

DEFAULT_FILES = ["Texas.geojson", "California.geojson"]


def filter_file(src_path: Path) -> None:
    """
    Stream src_path, keep features with roof_area_sqft >= ROOF_AREA_MIN,
    write to a temp file next to the original, then replace the original.
    """
    transformer = Transformer.from_crs(SRC_CRS, AREA_CRS, always_xy=True)

    tmp_path = src_path.with_suffix(".tmp.geojson")

    kept = 0
    total = 0

    log.info(f"=== {src_path.name}  ({src_path.stat().st_size / 1e9:.2f} GB) ===")
    log.info("Streaming and filtering — this will take several minutes ...")

    with fiona.open(str(src_path), "r") as src:
        meta = src.meta.copy()
        # Add our computed field to the schema
        meta["schema"]["properties"]["roof_area_sqft"] = "int"
        meta["driver"] = "GeoJSON"

        with fiona.open(str(tmp_path), "w", **meta) as dst:
            for feat in tqdm(src, desc=f"  {src_path.stem}", unit=" bldg", mininterval=3):
                total += 1
                try:
                    geom_wgs  = shape(feat["geometry"])
                    geom_proj = shp_transform(transformer.transform, geom_wgs)
                    area_sqft = int(geom_proj.area * 10.7639)
                except Exception:
                    continue  # skip malformed geometry

                if area_sqft >= ROOF_AREA_MIN:
                    props = dict(feat["properties"])
                    props["roof_area_sqft"] = area_sqft
                    new_feat = {
                        "type":       "Feature",
                        "geometry":   feat["geometry"],
                        "properties": props,
                    }
                    dst.write(new_feat)
                    kept += 1

                if total % 500_000 == 0:
                    log.info(f"  scanned {total:,}  |  kept {kept:,}")

    pct = (kept / total * 100) if total else 0
    log.info(f"  Done — scanned {total:,} buildings, kept {kept:,} ({pct:.2f}%)")

    # Replace original with filtered version
    log.info(f"  Replacing {src_path.name} with filtered version ...")
    src_path.unlink()
    tmp_path.rename(src_path)
    log.info(f"  {src_path.name} updated. New size: {src_path.stat().st_size / 1e6:.1f} MB")


def main():
    if len(sys.argv) > 1:
        filenames = sys.argv[1:]
    else:
        filenames = DEFAULT_FILES

    paths = []
    for name in filenames:
        p = RAW_DIR / name
        if not p.exists():
            log.error(f"File not found: {p}")
            sys.exit(1)
        paths.append(p)

    for p in paths:
        filter_file(p)

    log.info("All done.")


if __name__ == "__main__":
    main()
