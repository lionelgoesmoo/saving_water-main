"""
Step 6: Apply the 5-dimension Viability Scoring formula to every building,
        then produce the final output files:
          - output/buildings.json   (per-building records, top 50/state)
          - output/state_scores.json (aggregate market readiness per state)

Viability Score = weighted sum of 5 dimensions (each 0–100):
  Physical     (25%): roof area tier + cooling tower flag
  Financial    (25%): estimated annual water savings vs local rate
  Regulatory   (20%): state regulatory/incentive environment
  ESG          (20%): placeholder (50); upgraded if SBTi/LEED data available
  Climate Risk (10%): drought + water scarcity pressure
"""

import sys
import json
import math
import logging
from pathlib import Path

import numpy as np
import pandas as pd


def _sanitize(obj):
    """Recursively replace NaN/inf with None so json.dump produces valid JSON."""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    return obj
import geopandas as gpd
from pyproj import Transformer

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    TARGET_STATES,
    STATE_ABBR_TO_NAME,
    STATE_DISPLAY_NAMES,
    DATA_PROC,
    OUTPUT_DIR,
    BUILDINGS_JSON,
    STATE_SCORES_JSON,
    STATE_WATER_RATES,
    SEWER_RATE_MULTIPLIER,
    SEWER_DISCHARGE_FRACTION,
    REGULATORY_SCORES,
    DROUGHT_INDEX,
    SCORE_WEIGHTS,
    RUNOFF_COEFFICIENT,
    GALLON_PER_SQFT_INCH,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# Buildings to include per state in buildings.json (stratified grid sample)
STATE_SAMPLE_BUDGET = {
    # Large states (dense population / many buildings)
    "TX": 400, "CA": 400, "PA": 400, "NY": 400,
    "OH": 400, "NC": 400, "VA": 400, "WA": 400,
    # Medium states
    "CO": 300, "MO": 300, "AL": 300, "OK": 300,
    # Small / sparse states
    "AZ": 300, "NM": 250, "UT": 250, "MT": 250,
    "AR": 300, "ID": 250, "IA": 300, "NV": 300, "OR": 300, "TN": 300,
}

# Financial score: annual savings that maps to score=100
FINANCIAL_SCORE_MAX_SAVINGS = 75_000   # $75k/yr → score 100

# Physical score: roof area that maps to score=100 (beyond this it's still 100)
PHYSICAL_SCORE_MAX_SQFT = 500_000

# Stratified grid sampling constants
GRID_CELL_SIZE_M      = 25_000   # 25km cells in EPSG:5070
METRO_BIAS_FACTOR     = 2.0      # metro cells get 2× slots vs rural
METRO_DENSITY_PCTILE  = 75       # top-quartile cell density defines "metro"


# ── Scoring functions ──────────────────────────────────────────────────────────

def score_physical(row) -> float:
    """
    25% of total score.
    Components: roof area tier (70%) + cooling tower presence (30%).
    """
    area_norm = min(row["roof_area_sqft"] / PHYSICAL_SCORE_MAX_SQFT, 1.0)
    cooling   = 1.0 if row.get("cooling_tower") else 0.0
    raw = area_norm * 0.70 + cooling * 0.30
    return round(raw * 100, 1)


def score_financial(row) -> float:
    """
    25% of total score.
    Formula: annual_harvestable_gallons × (water_rate + sewer_avoidance).
    """
    state = row.get("state", "")
    water_rate  = STATE_WATER_RATES.get(state, 5.0)   # $/kgal
    sewer_rate  = water_rate * SEWER_RATE_MULTIPLIER

    precip  = float(row.get("annual_precip_in", 20.0))
    area    = float(row.get("roof_area_sqft", 0))

    # Annual harvestable gallons
    yield_gal = area * (precip / 12.0) * GALLON_PER_SQFT_INCH * RUNOFF_COEFFICIENT

    water_savings = (yield_gal / 1000.0) * water_rate
    sewer_savings = (yield_gal / 1000.0) * sewer_rate * SEWER_DISCHARGE_FRACTION
    total_savings = water_savings + sewer_savings

    # Store computed values back (used in output JSON)
    row["annual_harvestable_gallons"] = round(yield_gal)
    row["annual_water_savings"]       = round(water_savings, 2)
    row["annual_sewer_savings"]       = round(sewer_savings, 2)
    row["annual_total_savings"]       = round(total_savings, 2)
    row["water_rate_per_kgal"]        = water_rate

    norm = min(total_savings / FINANCIAL_SCORE_MAX_SAVINGS, 1.0)
    return round(norm * 100, 1)


def score_regulatory(row) -> float:
    """20% of total score. State-level pre-scored lookup."""
    return float(REGULATORY_SCORES.get(row.get("state", ""), 50))


def score_esg(_row) -> float:
    """
    20% of total score.
    Defaults to 50 (neutral). Upgraded to 80 if building owner is in SBTi list.
    SBTi enrichment is a future step — placeholder here.
    """
    return 50.0


def score_climate_risk(row) -> float:
    """10% of total score. State drought/water-scarcity pressure."""
    return float(DROUGHT_INDEX.get(row.get("state", ""), 50))


def compute_viability_score(row: pd.Series) -> dict:
    """
    Compute all dimension scores and the weighted composite.
    Modifies row in-place for computed financial fields.
    Returns dict of score breakdown.
    """
    # Pass as mutable dict so financial scores can store computed values
    r = row.to_dict()

    s_physical     = score_physical(r)
    s_financial    = score_financial(r)   # also populates financial fields in r
    s_regulatory   = score_regulatory(r)
    s_esg          = score_esg(r)
    s_climate_risk = score_climate_risk(r)

    composite = (
        s_physical     * SCORE_WEIGHTS["physical"]     +
        s_financial    * SCORE_WEIGHTS["financial"]     +
        s_regulatory   * SCORE_WEIGHTS["regulatory"]   +
        s_esg          * SCORE_WEIGHTS["esg"]           +
        s_climate_risk * SCORE_WEIGHTS["climate_risk"]
    )

    return {
        "viability_score": round(composite, 1),
        "score_physical":     s_physical,
        "score_financial":    s_financial,
        "score_regulatory":   s_regulatory,
        "score_esg":          s_esg,
        "score_climate_risk": s_climate_risk,
        # Financial computed values
        "annual_harvestable_gallons": r.get("annual_harvestable_gallons", 0),
        "annual_water_savings":       r.get("annual_water_savings", 0.0),
        "annual_sewer_savings":       r.get("annual_sewer_savings", 0.0),
        "annual_total_savings":       r.get("annual_total_savings", 0.0),
        "water_rate_per_kgal":        r.get("water_rate_per_kgal", 0.0),
    }


def score_state(gdf: gpd.GeoDataFrame, state_abbr: str) -> pd.DataFrame:
    log.info(f"[{state_abbr}] Scoring {len(gdf):,} buildings ...")
    records = []
    for _, row in gdf.iterrows():
        scores = compute_viability_score(row)
        rec = {
            "building_id":              row.get("building_id", ""),
            "state":                    row.get("state", state_abbr),
            "county_fips":              row.get("county_fips", ""),
            "county_name":              row.get("county_name", ""),
            "city_name":                row.get("city_name", ""),
            "address":                  row.get("address", "") or row.get("fac_address", ""),
            "fac_name":                 row.get("fac_name", ""),
            "building_class":           row.get("building_class", "commercial"),
            "centroid_lat":             row.get("centroid_lat"),
            "centroid_lon":             row.get("centroid_lon"),
            "roof_area_sqft":           int(row.get("roof_area_sqft", 0)),
            "cooling_tower":            bool(row.get("cooling_tower", False)),
            "cooling_tower_confidence": round(float(row.get("cooling_tower_confidence", 0.0)), 2),
            "cooling_tower_source":     row.get("cooling_tower_source", "none"),
            "annual_rainfall_in":       float(row.get("annual_precip_in", 0.0)),
            **scores,
        }
        records.append(rec)

    df = pd.DataFrame(records)
    df = df.sort_values("viability_score", ascending=False)
    log.info(
        f"[{state_abbr}] Score range: "
        f"{df['viability_score'].min():.1f} – {df['viability_score'].max():.1f}"
    )
    return df


def build_metro_summaries(df: pd.DataFrame, state_abbr: str) -> list:
    """Group buildings by city (fall back to county) → per-metro summary."""
    df = df.copy()
    df["_metro"] = df["city_name"].replace("", pd.NA).fillna(df["county_name"]).fillna("Unknown")

    metros = []
    for metro_name, group in df.groupby("_metro"):
        if len(group) < 3:
            continue
        avg_score = round(group["viability_score"].mean(), 1)
        # Derive top drivers for this metro
        drivers = []
        if STATE_WATER_RATES.get(state_abbr, 5) > 7:
            drivers.append("High water utility costs")
        if DROUGHT_INDEX.get(state_abbr, 50) > 70:
            drivers.append("Drought & water scarcity pressure")
        if group["cooling_tower"].mean() > 0.1:
            drivers.append("Cooling tower density")
        if not drivers:
            drivers = ["Rainwater harvesting potential"]
        metros.append({
            "metro":                  str(metro_name),
            "state_code":             state_abbr,
            "market_readiness_score": avg_score,
            "top_drivers":            drivers[:2],
            "candidate_count":        len(group),
        })

    return sorted(metros, key=lambda x: x["market_readiness_score"], reverse=True)


def build_state_summary(df: pd.DataFrame, state_abbr: str) -> dict:
    """Aggregate metrics for state_scores.json (frontend-compatible schema)."""
    ct_pct      = df["cooling_tower"].mean() if len(df) > 0 else 0.0
    avg_rain    = round(df["annual_rainfall_in"].mean(), 1)
    avg_savings = round(df["annual_total_savings"].mean(), 0)
    candidate_count = len(df)

    top_drivers = []
    if STATE_WATER_RATES.get(state_abbr, 5) > 7:
        top_drivers.append("High water utility costs")
    if DROUGHT_INDEX.get(state_abbr, 50) > 70:
        top_drivers.append("Drought & water scarcity pressure")
    if REGULATORY_SCORES.get(state_abbr, 50) > 75:
        top_drivers.append("Strong regulatory / incentive environment")
    if ct_pct > 0.3:
        top_drivers.append("High cooling tower density")
    if not top_drivers:
        top_drivers = ["Commercial building density", "Rainfall availability"]

    return {
        # Frontend-expected fields
        "state":      STATE_DISPLAY_NAMES.get(state_abbr, STATE_ABBR_TO_NAME.get(state_abbr, state_abbr)),
        "state_code": state_abbr,
        "market_readiness_score": round(df["viability_score"].mean(), 1),
        "top_drivers":    top_drivers[:3],
        "candidate_count": candidate_count,
        "score_breakdown": {
            "water_cost_pressure":  round(min(STATE_WATER_RATES.get(state_abbr, 5.0) / 12.0 * 100, 100), 1),
            "rainfall_capture":     round(min(avg_rain / 60.0 * 100, 100), 1),
            "commercial_density":   round(min(candidate_count / 150.0, 1.0) * 100, 1),
            "regulatory_pressure":  float(REGULATORY_SCORES.get(state_abbr, 50)),
            "esg_alignment":        50.0,
        },
        "metros": build_metro_summaries(df, state_abbr),
        # Extra detail fields
        "avg_roof_area_sqft":     int(df["roof_area_sqft"].mean()),
        "pct_cooling_tower":      round(ct_pct, 3),
        "avg_annual_rainfall_in": avg_rain,
        "avg_annual_savings_usd": avg_savings,
        "top_building_score":     df["viability_score"].max(),
    }


def derive_recommended_angle(bd: dict, state: str) -> str:
    """Pick the strongest sales angle based on score breakdown."""
    sb = bd.get("score_breakdown", {})
    if DROUGHT_INDEX.get(state, 50) > 70:
        return "resilience"
    if REGULATORY_SCORES.get(state, 50) > 75:
        return "compliance"
    if sb.get("financial", 0) > 60:
        return "cost_savings"
    if sb.get("esg", 0) >= 50:
        return "esg_credibility"
    return "cost_savings"


def derive_urgency_drivers(bd: dict) -> list:
    """Derive human-readable urgency drivers from score breakdown."""
    sb = bd.get("score_breakdown", {})
    drivers = []
    if sb.get("financial", 0) > 60:
        drivers.append("High water cost savings potential")
    if sb.get("climate_risk", 0) > 70:
        drivers.append("Severe drought / water scarcity risk")
    if sb.get("regulatory", 0) > 75:
        drivers.append("Strong incentive & regulatory environment")
    if bd.get("cooling_tower_present"):
        drivers.append("Cooling tower water recycling opportunity")
    if sb.get("physical", 0) > 70:
        drivers.append("Large harvestable roof area")
    return drivers[:3] or ["Rainwater harvesting candidate"]


def compute_financials(roof_sqft: int, annual_savings: float, cv_confidence: float) -> dict:
    """Estimate capex, payback, NPV, and ROI from roof area and savings."""
    capex_low = round(roof_sqft * 0.50, 0)
    capex_high = round(roof_sqft * 1.50, 0)
    capex_mid = (capex_low + capex_high) / 2

    payback = round(capex_mid / annual_savings, 1) if annual_savings > 0 else None

    # NPV at 6% discount over 10 years
    pv_factor = (1 - (1.06 ** -10)) / 0.06   # ≈ 7.36
    npv = round(annual_savings * pv_factor - capex_mid, 0)

    conf = max(cv_confidence, 0.1)   # avoid zero denominator
    roi = round((annual_savings / capex_mid) * conf * 100, 1) if capex_mid > 0 else 0.0

    incentive = round(annual_savings * 0.30, 2)

    return {
        "system_capex_range": [capex_low, capex_high],
        "simple_payback_yrs": payback,
        "npv_10yr_usd":       npv,
        "confidence_adj_roi_pct": roi,
        "incentive_value_usd": incentive,
    }


def to_building_record(row: pd.Series) -> dict:
    """Format a single building for buildings.json (frontend-compatible schema)."""
    state      = row["state"]
    water_rate = float(row.get("water_rate_per_kgal", STATE_WATER_RATES.get(state, 5.0)))
    total_sav  = float(row.get("annual_total_savings", 0.0))
    roof_sqft  = int(row.get("roof_area_sqft", 0))
    # Use cooling_tower_confidence if present; otherwise default to 0.65
    # (satellite imagery detection baseline confidence for large commercial roofs)
    raw_conf = row.get("cooling_tower_confidence", None)
    cv_conf  = float(raw_conf) if raw_conf else 0.65
    ct_present = bool(row.get("cooling_tower", False))

    score_bd = {
        "physical":     row.get("score_physical", 0),
        "financial":    row.get("score_financial", 0),
        "regulatory":   row.get("score_regulatory", 0),
        "esg":          row.get("score_esg", 50),
        "climate_risk": row.get("score_climate_risk", 0),
    }

    fin = compute_financials(roof_sqft, total_sav, cv_conf)

    record = {
        # Identifiers
        "building_id":    row["building_id"],
        "address":        (row.get("address") if pd.notna(row.get("address")) else None) or (row.get("fac_name") if pd.notna(row.get("fac_name")) else None) or "",
        "metro":          row.get("city_name") or row.get("county_name") or "",
        "state":          state,
        # Coordinates (split for frontend)
        "lat":            row.get("centroid_lat"),
        "lng":            row.get("centroid_lon"),
        # Extra geo (pipeline bonus, ignored by frontend)
        "city":           row.get("city_name", ""),
        "county":         row.get("county_name", ""),
        "county_fips":    row.get("county_fips", ""),
        # Building attributes
        "roof_geometry":  None,
        "building_type":  row.get("building_class", "commercial"),
        "imagery_date":   None,
        "imagery_source": None,
        "imagery_url":    None,
        "roof_area_sqft": roof_sqft,
        # Cooling tower
        "cooling_tower_present":    ct_present,
        "cooling_tower_count":      1 if ct_present else 0,
        "cooling_tower_source":     row.get("cooling_tower_source", "none"),
        "cv_confidence_score":      cv_conf,
        # Water data
        "annual_rainfall_in":       float(row.get("annual_rainfall_in", 0.0)),
        "harvestable_gal_yr":       int(row.get("annual_harvestable_gallons", 0)),
        "water_rate_per_kgal":      water_rate,
        "sewer_rate_per_kgal":      round(water_rate * SEWER_RATE_MULTIPLIER, 2),
        "annual_water_savings_usd": float(row.get("annual_water_savings", 0.0)),
        "annual_sewer_savings_usd": float(row.get("annual_sewer_savings", 0.0)),
        "annual_total_savings_usd": total_sav,
        # Financial estimates
        **fin,
        # Scoring
        "viability_score":    row["viability_score"],
        "urgency_score":         max(1, min(10, round(row["viability_score"] / 10))),
        "drought_risk_index":    DROUGHT_INDEX.get(state, 50),
        "flood_risk_index":      0,
        "stormwater_fee_active": False,
        "stormwater_fee_usd_yr": 0.0,
        "score_breakdown":       score_bd,
        "urgency_drivers":       derive_urgency_drivers({"score_breakdown": score_bd, "cooling_tower_present": ct_present}),
        "recommended_angle":     derive_recommended_angle({"score_breakdown": score_bd}, state),
    }
    return record


def stratified_sample(df: pd.DataFrame, budget: int) -> pd.DataFrame:
    """
    Select `budget` buildings from `df` using a 25km grid with metro bias.

    Algorithm:
      1. Project centroids to EPSG:5070, assign each to a 25km grid cell.
      2. Count buildings per cell; top-quartile cells are "metro" → get 2× weight.
      3. Allocate slots proportionally (min 1 per cell), take top-k per cell by score.
      4. Trim/backfill to hit exactly `budget`.
    """
    if len(df) <= budget:
        return df

    df = df.copy().reset_index(drop=True)

    # Project centroids to metric CRS
    tr = Transformer.from_crs("EPSG:4326", "EPSG:5070", always_xy=True)
    xs, ys = tr.transform(df["centroid_lon"].values, df["centroid_lat"].values)

    df["_cx"] = (xs // GRID_CELL_SIZE_M).astype(int)
    df["_cy"] = (ys // GRID_CELL_SIZE_M).astype(int)
    df["_cell"] = df["_cx"].astype(str) + ":" + df["_cy"].astype(str)

    # Per-cell building counts
    counts = df.groupby("_cell").size()
    metro_thresh = float(np.percentile(counts.values, METRO_DENSITY_PCTILE))

    df["_weight"] = df["_cell"].map(counts).ge(metro_thresh).map(
        {True: METRO_BIAS_FACTOR, False: 1.0}
    )

    # Allocate slots per cell (proportional to weighted count, min 1)
    cell_info = df.groupby("_cell").agg(
        count=("building_id", "count"),
        weight=("_weight", "first"),
    )
    cell_info["wc"] = cell_info["count"] * cell_info["weight"]
    cell_info["slots"] = (
        (cell_info["wc"] / cell_info["wc"].sum() * budget)
        .round()
        .astype(int)
        .clip(lower=1)
    )

    # Select top-k per cell by viability_score
    selected_idx = []
    for cell_id, cell_df in df.groupby("_cell"):
        k = int(cell_info.loc[cell_id, "slots"])
        selected_idx.extend(cell_df.nlargest(k, "viability_score").index.tolist())

    result = df.loc[selected_idx].sort_values("viability_score", ascending=False)

    # Trim or backfill to exact budget
    if len(result) > budget:
        result = result.head(budget)
    elif len(result) < budget:
        gap = budget - len(result)
        extras = df[~df.index.isin(selected_idx)].nlargest(gap, "viability_score")
        result = pd.concat([result, extras]).sort_values("viability_score", ascending=False)

    return result.drop(columns=["_cx", "_cy", "_cell", "_weight"], errors="ignore")


def run(states: dict = None):
    states = states or TARGET_STATES
    all_buildings   = []
    state_summaries = []   # array — frontend expects list not dict

    for _, state_abbr in states.items():
        addressed_path = DATA_PROC / f"buildings_addressed_{state_abbr}.gpkg"
        if not addressed_path.exists():
            log.warning(
                f"[{state_abbr}] Missing buildings_addressed file — "
                "trying buildings_rainfall as fallback."
            )
            addressed_path = DATA_PROC / f"buildings_rainfall_{state_abbr}.gpkg"
        if not addressed_path.exists():
            log.error(f"[{state_abbr}] No input file found. Run previous steps first.")
            continue

        gdf     = gpd.read_file(addressed_path, layer="buildings")
        scored  = score_state(gdf, state_abbr)

        # State summary uses all buildings
        state_summaries.append(build_state_summary(scored, state_abbr))

        # buildings.json uses stratified grid sample
        budget = STATE_SAMPLE_BUDGET.get(state_abbr, 300)
        top = stratified_sample(scored, budget)
        all_buildings.extend(top.apply(to_building_record, axis=1).tolist())
        log.info(f"[{state_abbr}] {len(top)} buildings selected via stratified grid sample.")

    # Write buildings.json
    with open(BUILDINGS_JSON, "w") as f:
        json.dump(_sanitize(all_buildings), f, indent=2)
    log.info(f"Written {len(all_buildings)} buildings → {BUILDINGS_JSON}")

    # Write state_scores.json
    with open(STATE_SCORES_JSON, "w") as f:
        json.dump(_sanitize(state_summaries), f, indent=2)
    log.info(f"Written {len(state_summaries)} state summaries → {STATE_SCORES_JSON}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        abbrs = set(sys.argv[1:])
        states = {k: v for k, v in TARGET_STATES.items() if v in abbrs}
    else:
        states = TARGET_STATES
    run(states)
