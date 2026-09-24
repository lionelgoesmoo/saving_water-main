"""
Step 3: Spatial join — match each large building (from Step 1) to the nearest
        EPA FRS industrial facility (from Step 2) within a distance threshold.
        Then enrich with county name (Census TIGER) and city name (Census Places).

A building that falls within MAX_MATCH_METERS of an EPA NPDES/industrial facility
gets: facility name, address, NAICS code, cooling_tower=True, and a confidence score.
Buildings without a match keep cooling_tower=False, confidence=0.

Output: data/processed/buildings_enriched_{STATE}.gpkg
"""

import sys
import io
import zipfile
import logging
import requests
from pathlib import Path

import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import TARGET_STATES, DATA_PROC, DATA_RAW, CENSUS_PLACES_URL

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# Equal-area CRS for distance calculations (meters)
METRIC_CRS = "EPSG:5070"

# Max distance (meters) between building centroid and EPA facility to count as a match.
# 100m covers same parcel + adjacent parcels.  Increase to 200m for looser matching.
MAX_MATCH_METERS = 100


def load_buildings(state_abbr: str) -> gpd.GeoDataFrame:
    path = DATA_PROC / f"large_buildings_{state_abbr}.gpkg"
    if not path.exists():
        raise FileNotFoundError(
            f"Run 01_download_footprints.py first. Missing: {path}"
        )
    gdf = gpd.read_file(path, layer="buildings")
    log.info(f"[{state_abbr}] Loaded {len(gdf):,} large buildings.")
    return gdf


def load_facilities(state_abbr: str) -> gpd.GeoDataFrame:
    path = DATA_PROC / f"industrial_facilities_{state_abbr}.csv"
    if not path.exists():
        raise FileNotFoundError(
            f"Run 02_download_epa_frs.py first. Missing: {path}"
        )
    df = pd.read_csv(path, dtype=str)
    df["latitude"]  = pd.to_numeric(df["latitude"],  errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")
    df = df.dropna(subset=["latitude", "longitude"])

    gdf = gpd.GeoDataFrame(
        df,
        geometry=gpd.points_from_xy(df["longitude"], df["latitude"]),
        crs="EPSG:4326",
    )
    log.info(f"[{state_abbr}] Loaded {len(gdf):,} EPA industrial facilities.")
    return gdf


def join(buildings: gpd.GeoDataFrame, facilities: gpd.GeoDataFrame, state_abbr: str) -> gpd.GeoDataFrame:
    """
    For each building centroid, find the nearest EPA facility within MAX_MATCH_METERS.
    Uses the building polygon centroid (already in WGS84) projected to metric CRS.
    """
    # Work in metric CRS
    bldg_metric = buildings.copy()
    bldg_metric["_centroid_geom"] = (
        bldg_metric.geometry.centroid.to_crs(METRIC_CRS)
    )
    bldg_centroids = bldg_metric.set_geometry("_centroid_geom").drop(
        columns=["geometry"]
    )

    fac_metric = facilities.to_crs(METRIC_CRS)

    # Prefix facility columns to avoid collisions
    fac_cols_rename = {
        c: f"fac_{c}" for c in fac_metric.columns if c != "geometry"
    }
    fac_metric = fac_metric.rename(columns=fac_cols_rename)

    log.info(f"[{state_abbr}] Running sjoin_nearest (max {MAX_MATCH_METERS}m) ...")
    joined = gpd.sjoin_nearest(
        bldg_centroids,
        fac_metric,
        how="left",
        max_distance=MAX_MATCH_METERS,
        distance_col="_dist_m",
    )

    # Drop duplicate building rows if multiple facilities matched (keep closest)
    joined = joined.sort_values("_dist_m").drop_duplicates(subset=["building_id"])

    # Restore original building polygon geometry
    joined = joined.drop(columns=["_centroid_geom"]).merge(
        buildings[["building_id", "geometry"]],
        on="building_id",
        how="left",
    )
    joined = gpd.GeoDataFrame(joined, geometry="geometry", crs="EPSG:4326")

    # Derive cooling tower flag from whether there was a match
    matched = joined["_dist_m"].notna() & (joined["_dist_m"] <= MAX_MATCH_METERS)
    joined["cooling_tower"] = matched
    joined["cooling_tower_source"] = matched.map(
        {True: "EPA_FRS_NAICS", False: "none"}
    )
    joined["cooling_tower_confidence"] = joined.apply(
        lambda r: float(r.get("fac_cooling_tower_confidence", 0.0))
        if r["cooling_tower"] else 0.0,
        axis=1,
    )

    # Flatten address fields from EPA
    joined["fac_address"] = joined.apply(
        lambda r: (
            f"{r.get('fac_address_street', '')} {r.get('fac_city', '')} "
            f"{r.get('fac_state', '')} {r.get('fac_zip', '')}".strip()
        ) if r["cooling_tower"] else "",
        axis=1,
    )
    joined["fac_name"] = joined.get("fac_facility_name", "")

    # Keep tidy set of columns
    keep = [
        "building_id", "state", "roof_area_sqft",
        "centroid_lat", "centroid_lon",
        "cooling_tower", "cooling_tower_source", "cooling_tower_confidence",
        "fac_name", "fac_address", "fac_naics_matched",
        "geometry",
    ]
    available = [c for c in keep if c in joined.columns]
    result = joined[available].copy()

    n_matched = matched.sum()
    log.info(
        f"[{state_abbr}] Matched {n_matched:,}/{len(buildings):,} buildings "
        f"to EPA facilities ({n_matched/len(buildings)*100:.1f}%)"
    )
    return result


def _ensure_places_gpkg() -> Path:
    """Download Census Places shapefile once and cache as .gpkg in data/raw/."""
    out = DATA_RAW / "us_places.gpkg"
    if out.exists():
        return out
    log.info("Downloading Census Places shapefile (~20MB) ...")
    resp = requests.get(CENSUS_PLACES_URL, timeout=120, stream=True)
    resp.raise_for_status()
    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    shp_names = [n for n in zf.namelist() if n.endswith(".shp")]
    if not shp_names:
        raise RuntimeError("No .shp file found in Census Places zip")
    # Read directly from zip bytes
    with zf.open(shp_names[0]) as shp_file:
        # geopandas can read from a zip path string
        pass
    # Use the zip path trick geopandas supports
    zip_path = f"zip+https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_place_500k.zip"
    # Simpler: extract to temp buffer and read
    import tempfile, os, shutil
    tmpdir = tempfile.mkdtemp()
    try:
        zf.extractall(tmpdir)
        shp = next(Path(tmpdir).rglob("*.shp"))
        places = gpd.read_file(str(shp), engine="pyogrio")
        places.to_file(str(out), driver="GPKG", layer="places")
        log.info(f"Census Places cached → {out} ({len(places):,} places)")
    finally:
        shutil.rmtree(tmpdir)
    return out


def join_county(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Add county_fips and county_name via Census TIGER point-in-polygon join."""
    counties_path = DATA_RAW / "us_counties.gpkg"
    if not counties_path.exists():
        log.warning("us_counties.gpkg not found — county fields will be empty")
        gdf["county_fips"] = ""
        gdf["county_name"] = ""
        return gdf

    counties = gpd.read_file(str(counties_path)).to_crs("EPSG:4326")

    centroids = gpd.GeoDataFrame(
        gdf[["building_id"]].copy(),
        geometry=gpd.points_from_xy(gdf["centroid_lon"], gdf["centroid_lat"]),
        crs="EPSG:4326",
    )

    joined = gpd.sjoin(
        centroids,
        counties[["GEOID", "NAME", "geometry"]],
        how="left",
        predicate="within",
    ).drop_duplicates(subset=["building_id"])

    fips_map = joined.set_index("building_id")["GEOID"]
    name_map = joined.set_index("building_id")["NAME"]

    gdf = gdf.copy()
    gdf["county_fips"] = gdf["building_id"].map(fips_map).fillna("")
    gdf["county_name"] = gdf["building_id"].map(name_map).fillna("")
    n_matched = gdf["county_fips"].ne("").sum()
    log.info(f"County join: {n_matched:,}/{len(gdf):,} buildings matched")
    return gdf


def join_city(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Add city_name via Census Places point-in-polygon join."""
    try:
        places_path = _ensure_places_gpkg()
    except Exception as e:
        log.warning(f"Could not load Census Places: {e} — city_name will be empty")
        gdf["city_name"] = ""
        return gdf

    places = gpd.read_file(str(places_path)).to_crs("EPSG:4326")

    centroids = gpd.GeoDataFrame(
        gdf[["building_id"]].copy(),
        geometry=gpd.points_from_xy(gdf["centroid_lon"], gdf["centroid_lat"]),
        crs="EPSG:4326",
    )

    joined = gpd.sjoin(
        centroids,
        places[["NAME", "geometry"]],
        how="left",
        predicate="within",
    ).drop_duplicates(subset=["building_id"])

    city_map = joined.set_index("building_id")["NAME"]

    gdf = gdf.copy()
    gdf["city_name"] = gdf["building_id"].map(city_map).fillna("")
    n_matched = gdf["city_name"].ne("").sum()
    log.info(f"City join: {n_matched:,}/{len(gdf):,} buildings matched to a Census Place")
    return gdf


def save(gdf: gpd.GeoDataFrame, state_abbr: str) -> Path:
    out = DATA_PROC / f"buildings_enriched_{state_abbr}.gpkg"
    gdf.to_file(out, driver="GPKG", layer="buildings")
    log.info(f"[{state_abbr}] Saved {len(gdf):,} enriched buildings → {out}")
    return out


def run(states: dict = None):
    states = states or TARGET_STATES
    for _, state_abbr in states.items():
        out_path = DATA_PROC / f"buildings_enriched_{state_abbr}.gpkg"
        if out_path.exists():
            log.info(f"[{state_abbr}] Output already exists, skipping.")
            continue
        buildings  = load_buildings(state_abbr)
        facilities = load_facilities(state_abbr)
        enriched   = join(buildings, facilities, state_abbr)
        enriched   = join_county(enriched)
        enriched   = join_city(enriched)
        save(enriched, state_abbr)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        abbrs = set(sys.argv[1:])
        states = {k: v for k, v in TARGET_STATES.items() if v in abbrs}
    else:
        states = TARGET_STATES
    run(states)
