"""
Step 4: Attach NOAA 30-year annual precipitation normals to each building
        using the NOAA CDO API (token in config.py).

Strategy:
  1. Fetch all ANN-PRCP-NORMAL station records for the state via CDO API.
  2. Fetch station metadata (lat/lon) via the stations endpoint.
  3. Spatially match each building centroid to its nearest station.
  4. Fall back to state average if no station data available.

Output: data/processed/buildings_rainfall_{STATE}.gpkg
"""

import sys
import time
import logging
from pathlib import Path

import requests
import pandas as pd
import geopandas as gpd

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import TARGET_STATES, DATA_RAW, DATA_PROC, NOAA_CDO_TOKEN

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

CDO_BASE      = "https://www.ncei.noaa.gov/cdo-web/api/v2"
PAGE_SIZE     = 1000
REQUEST_DELAY = 0.25  # seconds between API calls

# State FIPS codes for CDO location filter
STATE_FIPS = {
    "TX": "48", "CA": "06", "NY": "36", "AZ": "04", "PA": "42",
    "AL": "01", "CO": "08", "MO": "29", "MT": "30", "NM": "35",
    "NC": "37", "OH": "39", "OK": "40", "UT": "49", "VA": "51",
    "WA": "53", "FL": "12",
    "AR": "05", "ID": "16", "IA": "19", "NV": "32", "OR": "41", "TN": "47",
}

# Fallback annual precip (inches) if API unavailable
STATE_PRECIP_FALLBACK = {
    "TX": 29.5, "CA": 22.2, "NY": 46.7, "AZ": 13.6, "PA": 42.9,
    "AL": 56.9, "CO": 15.9, "MO": 42.2, "MT": 15.3, "NM": 14.6,
    "NC": 50.3, "OH": 39.1, "OK": 36.5, "UT": 12.2, "VA": 44.3,
    "WA": 38.4, "FL": 54.5,
    "AR": 50.6, "ID": 18.9, "IA": 34.7, "NV": 9.5, "OR": 27.4, "TN": 54.0,
}


def cdo_get(endpoint: str, params: dict) -> dict:
    resp = requests.get(
        f"{CDO_BASE}/{endpoint}",
        params=params,
        headers={"token": NOAA_CDO_TOKEN},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_stations_for_state(state_abbr: str) -> pd.DataFrame:
    """
    Fetch all weather stations in a state that have ANN-PRCP-NORMAL data.
    Returns DataFrame with: station_id, name, latitude, longitude, annual_precip_in.
    Caches result to data/raw/ so subsequent runs are instant.
    """
    fips = STATE_FIPS.get(state_abbr)
    if not fips:
        return pd.DataFrame()

    cache_path = DATA_RAW / f"noaa_stations_{state_abbr}.csv"
    if cache_path.exists():
        log.info(f"[{state_abbr}] NOAA stations already cached.")
        df = pd.read_csv(cache_path)
        df["annual_precip_in"] = pd.to_numeric(df["annual_precip_in"], errors="coerce")
        return df.dropna(subset=["annual_precip_in", "latitude", "longitude"])

    log.info(f"[{state_abbr}] Fetching NOAA annual precip normals via CDO API ...")

    # ── Step 1: Fetch all precip records for state ────────────────────────────
    all_records = []
    offset = 1
    while True:
        try:
            data = cdo_get("data", {
                "datasetid":  "NORMAL_ANN",
                "datatypeid": "ANN-PRCP-NORMAL",
                "locationid": f"FIPS:{fips}",
                "startdate":  "2010-01-01",
                "enddate":    "2010-01-01",
                "units":      "standard",
                "limit":      PAGE_SIZE,
                "offset":     offset,
            })
        except Exception as e:
            log.warning(f"  CDO data error at offset {offset}: {e}")
            break

        results = data.get("results", [])
        if not results:
            break

        all_records.extend(results)
        total = data.get("metadata", {}).get("resultset", {}).get("count", 0)
        log.info(f"  Records: {len(all_records)}/{total}")

        if len(all_records) >= total:
            break
        offset += PAGE_SIZE
        time.sleep(REQUEST_DELAY)

    if not all_records:
        log.warning(f"[{state_abbr}] No CDO records returned.")
        return pd.DataFrame()

    records_df = pd.DataFrame(all_records)[["station", "value"]].rename(
        columns={"station": "station_id", "value": "annual_precip_in"}
    )

    # ── Step 2: Fetch station metadata (lat/lon) ──────────────────────────────
    log.info(f"[{state_abbr}] Fetching station coordinates ({len(records_df):,} stations) ...")
    station_meta = []
    offset = 1

    while True:
        try:
            data = cdo_get("stations", {
                "datasetid":  "NORMAL_ANN",
                "locationid": f"FIPS:{fips}",
                "limit":      PAGE_SIZE,
                "offset":     offset,
            })
        except Exception as e:
            log.warning(f"  Station metadata error at offset {offset}: {e}")
            break

        results = data.get("results", [])
        if not results:
            break

        for s in results:
            station_meta.append({
                "station_id": s["id"],
                "name":       s.get("name", ""),
                "latitude":   s.get("latitude"),
                "longitude":  s.get("longitude"),
            })

        total = data.get("metadata", {}).get("resultset", {}).get("count", 0)
        if len(station_meta) >= total:
            break
        offset += PAGE_SIZE
        time.sleep(REQUEST_DELAY)

    if not station_meta:
        log.warning(f"[{state_abbr}] No station metadata returned.")
        return pd.DataFrame()

    meta_df = pd.DataFrame(station_meta)
    merged  = records_df.merge(meta_df, on="station_id", how="inner")
    merged  = merged.dropna(subset=["latitude", "longitude", "annual_precip_in"])
    merged["annual_precip_in"] = pd.to_numeric(merged["annual_precip_in"], errors="coerce")
    merged  = merged.dropna(subset=["annual_precip_in"])

    merged.to_csv(cache_path, index=False)
    log.info(f"[{state_abbr}] {len(merged):,} stations cached → {cache_path}")
    return merged


def attach_rainfall(buildings: gpd.GeoDataFrame, stations_df: pd.DataFrame,
                    state_abbr: str) -> gpd.GeoDataFrame:
    """Match each building to its nearest NOAA weather station."""
    fallback = STATE_PRECIP_FALLBACK.get(state_abbr, 30.0)

    if stations_df.empty:
        log.warning(f"[{state_abbr}] No station data — using state fallback {fallback}\"")
        buildings["annual_precip_in"] = fallback
        buildings["precip_source"]    = "state_fallback"
        buildings["station_id"]       = None
        return buildings

    stations_gdf = gpd.GeoDataFrame(
        stations_df,
        geometry=gpd.points_from_xy(stations_df["longitude"], stations_df["latitude"]),
        crs="EPSG:4326",
    ).to_crs("EPSG:5070")

    centroids = gpd.GeoDataFrame(
        buildings[["building_id"]],
        geometry=gpd.points_from_xy(buildings["centroid_lon"], buildings["centroid_lat"]),
        crs="EPSG:4326",
    ).to_crs("EPSG:5070")

    matched = gpd.sjoin_nearest(
        centroids,
        stations_gdf[["station_id", "annual_precip_in", "geometry"]],
        how="left",
        distance_col="_station_dist_m",
    ).drop_duplicates(subset=["building_id"])

    result = buildings.merge(
        matched[["building_id", "annual_precip_in", "station_id"]],
        on="building_id", how="left",
    )
    result["annual_precip_in"] = result["annual_precip_in"].fillna(fallback).round(1)
    result["precip_source"]    = result["station_id"].apply(
        lambda x: "NOAA_station" if pd.notna(x) else "state_fallback"
    )

    log.info(
        f"[{state_abbr}] Rainfall attached. "
        f"Avg: {result['annual_precip_in'].mean():.1f}\" | "
        f"Min: {result['annual_precip_in'].min():.1f}\" | "
        f"Max: {result['annual_precip_in'].max():.1f}\""
    )
    return gpd.GeoDataFrame(result, geometry="geometry", crs="EPSG:4326")


def save(gdf: gpd.GeoDataFrame, state_abbr: str) -> Path:
    out = DATA_PROC / f"buildings_rainfall_{state_abbr}.gpkg"
    gdf.to_file(out, driver="GPKG", layer="buildings")
    log.info(f"[{state_abbr}] Saved {len(gdf):,} buildings with rainfall → {out}")
    return out


def run(states: dict = None):
    states = states or TARGET_STATES
    for _, state_abbr in states.items():
        out_path = DATA_PROC / f"buildings_rainfall_{state_abbr}.gpkg"
        if out_path.exists():
            log.info(f"[{state_abbr}] Output already exists, skipping.")
            continue

        enriched_path = DATA_PROC / f"buildings_enriched_{state_abbr}.gpkg"
        if not enriched_path.exists():
            raise FileNotFoundError(f"Run 03_spatial_join.py first. Missing: {enriched_path}")

        buildings   = gpd.read_file(enriched_path, layer="buildings")
        stations_df = fetch_stations_for_state(state_abbr)
        result      = attach_rainfall(buildings, stations_df, state_abbr)
        save(result, state_abbr)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        abbrs = set(sys.argv[1:])
        states = {k: v for k, v in TARGET_STATES.items() if v in abbrs}
    else:
        states = TARGET_STATES
    run(states)
