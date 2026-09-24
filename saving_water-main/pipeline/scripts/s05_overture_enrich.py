"""
Step 5: Enrich buildings that have no EPA-matched address with data from
        Overture Maps (building class + address) via DuckDB querying S3 Parquet.

Only processes buildings where fac_address is empty/null.
Overture adds: address, building_class (commercial/industrial/warehouse/etc.)

Requires: pip install duckdb

Output: data/processed/buildings_addressed_{STATE}.gpkg
"""

import sys
import json
import logging
from pathlib import Path

import pandas as pd
import geopandas as gpd
from shapely.geometry import shape

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import TARGET_STATES, DATA_PROC, OVERTURE_S3_PATH, STATE_BBOXES, OVERTURE_RELEASE

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def check_duckdb():
    try:
        import duckdb
        return duckdb
    except ImportError:
        raise ImportError(
            "duckdb is required: pip install duckdb"
        )


def query_overture(state_abbr: str, duckdb) -> pd.DataFrame:
    """
    Query Overture Maps buildings for a state's bounding box.
    Returns a DataFrame with: id, address, building_class, centroid_lon, centroid_lat.
    """
    bbox = STATE_BBOXES.get(state_abbr)
    if bbox is None:
        log.warning(f"[{state_abbr}] No bounding box defined, skipping Overture query.")
        return pd.DataFrame()

    min_lon, min_lat, max_lon, max_lat = bbox

    # Note: Overture releases are dated; update OVERTURE_RELEASE in config.py as needed.
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
        CAST(names AS JSON)     AS names_json,
        CAST(addresses AS JSON) AS addresses_json,
        ST_X(ST_Centroid(geometry)) AS centroid_lon,
        ST_Y(ST_Centroid(geometry)) AS centroid_lat
    FROM read_parquet('{s3_path}', hive_partitioning=1)
    WHERE
        bbox.xmin >= {min_lon}
        AND bbox.xmax <= {max_lon}
        AND bbox.ymin >= {min_lat}
        AND bbox.ymax <= {max_lat}
        AND class IN ('commercial', 'industrial', 'office',
                      'warehouse', 'retail', 'civic', 'hospital',
                      'hotel', 'data_center', 'manufacturing')
    LIMIT 200000;
    """

    log.info(f"[{state_abbr}] Querying Overture Maps S3 (this may take a few minutes)...")
    con = duckdb.connect()
    try:
        df = con.execute(query).df()
    finally:
        con.close()

    log.info(f"[{state_abbr}] Overture returned {len(df):,} commercial/industrial buildings.")
    return df


def parse_overture_address(addresses_json: str) -> str:
    """Extract a human-readable address from Overture's JSON address field."""
    if not addresses_json or addresses_json in ("null", "[]", "{}"):
        return ""
    try:
        data = json.loads(addresses_json)
        if isinstance(data, list) and data:
            addr = data[0]
        elif isinstance(data, dict):
            addr = data
        else:
            return ""
        parts = [
            addr.get("freeform", ""),
            addr.get("locality", ""),
            addr.get("region", ""),
            addr.get("postcode", ""),
        ]
        return ", ".join(p for p in parts if p).strip(", ")
    except Exception:
        return ""


def parse_overture_name(names_json: str) -> str:
    """Extract primary name from Overture's names JSON field."""
    if not names_json or names_json in ("null", "[]", "{}"):
        return ""
    try:
        data = json.loads(names_json)
        if isinstance(data, dict):
            primary = data.get("primary", "")
            if primary:
                return primary
            # Try common field
            common = data.get("common", {})
            if isinstance(common, dict):
                return next(iter(common.values()), "")
        return ""
    except Exception:
        return ""


def nearest_overture_match(
    buildings: gpd.GeoDataFrame,
    overture_df: pd.DataFrame,
    state_abbr: str,
) -> gpd.GeoDataFrame:
    """
    For buildings missing an address, find the closest Overture building
    within 30m and copy its address + class.
    """
    if overture_df.empty:
        buildings["building_class"] = "unknown"
        buildings["address"] = buildings.get("fac_address", "")
        return buildings

    # Parse Overture address/name fields
    overture_df = overture_df.copy()
    overture_df["ov_address"] = overture_df["addresses_json"].apply(parse_overture_address)
    overture_df["ov_name"]    = overture_df["names_json"].apply(parse_overture_name)
    overture_df["ov_class"]   = overture_df["class"].fillna("commercial")

    ov_gdf = gpd.GeoDataFrame(
        overture_df[["id", "ov_name", "ov_address", "ov_class",
                     "centroid_lon", "centroid_lat"]],
        geometry=gpd.points_from_xy(overture_df["centroid_lon"], overture_df["centroid_lat"]),
        crs="EPSG:4326",
    ).to_crs("EPSG:5070")

    # Buildings needing address enrichment
    needs_address = (
        buildings["fac_address"].isna() | (buildings["fac_address"] == "")
    )
    bldg_need = buildings[needs_address].copy()
    bldg_have = buildings[~needs_address].copy()

    log.info(
        f"[{state_abbr}] {needs_address.sum():,} buildings need address enrichment, "
        f"{(~needs_address).sum():,} already have EPA address."
    )

    if len(bldg_need) > 0:
        centroids_need = gpd.GeoDataFrame(
            bldg_need[["building_id"]],
            geometry=gpd.points_from_xy(
                bldg_need["centroid_lon"], bldg_need["centroid_lat"]
            ),
            crs="EPSG:4326",
        ).to_crs("EPSG:5070")

        matched = gpd.sjoin_nearest(
            centroids_need, ov_gdf,
            how="left", max_distance=50, distance_col="_ov_dist"
        )
        matched = matched.drop_duplicates(subset=["building_id"])

        bldg_need = bldg_need.merge(
            matched[["building_id", "ov_name", "ov_address", "ov_class"]],
            on="building_id", how="left"
        )
        bldg_need["address"]        = bldg_need["ov_address"].fillna("")
        bldg_need["building_class"] = bldg_need["ov_class"].fillna("commercial")
        bldg_need["fac_name"]       = bldg_need.apply(
            lambda r: r["ov_name"] if (not r.get("fac_name")) else r.get("fac_name", ""),
            axis=1
        )
        bldg_need = bldg_need.drop(columns=["ov_name", "ov_address", "ov_class"], errors="ignore")

    # Buildings that already had EPA addresses
    bldg_have["address"]        = bldg_have["fac_address"]
    bldg_have["building_class"] = "industrial"  # EPA NAICS match = industrial

    result = pd.concat([bldg_have, bldg_need], ignore_index=True)
    result = gpd.GeoDataFrame(result, geometry="geometry", crs="EPSG:4326")
    return result


def save(gdf: gpd.GeoDataFrame, state_abbr: str) -> Path:
    out = DATA_PROC / f"buildings_addressed_{state_abbr}.gpkg"
    gdf.to_file(out, driver="GPKG", layer="buildings")
    log.info(f"[{state_abbr}] Saved {len(gdf):,} address-enriched buildings → {out}")
    return out


def run(states: dict = None):
    duckdb = check_duckdb()
    states = states or TARGET_STATES

    for _, state_abbr in states.items():
        out_path = DATA_PROC / f"buildings_addressed_{state_abbr}.gpkg"
        if out_path.exists():
            log.info(f"[{state_abbr}] Output already exists, skipping.")
            continue

        rain_path = DATA_PROC / f"buildings_rainfall_{state_abbr}.gpkg"
        if not rain_path.exists():
            raise FileNotFoundError(
                f"Run 04_rainfall_join.py first. Missing: {rain_path}"
            )

        buildings    = gpd.read_file(rain_path, layer="buildings")
        overture_df  = query_overture(state_abbr, duckdb)
        result       = nearest_overture_match(buildings, overture_df, state_abbr)
        save(result, state_abbr)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        abbrs = set(sys.argv[1:])
        states = {k: v for k, v in TARGET_STATES.items() if v in abbrs}
    else:
        states = TARGET_STATES
    run(states)
