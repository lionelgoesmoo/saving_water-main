# roi_engine.py
from dataclasses import dataclass
from models import BuildingRecord

COLLECTION_EFFICIENCY = 0.85
DISCHARGE_FRACTION = 0.70
GAL_PER_SQFT_PER_INCH = 0.623
CO2_LBS_PER_KGAL = 3.2
DISCOUNT_RATE = 0.05

# Kenya/East Africa defaults
DEFAULT_MUNICIPAL_WATER_RATE_KSH_M3 = 180  # NCWSC commercial rate baseline
DEFAULT_SEWER_RATE_KSH_M3 = 135  # ~75% of water rate
DEFAULT_BOWSER_RATE_KSH_M3 = 750  # Avoided water truck/bowser costs during grid cutoffs
USD_TO_KSH_CONVERSION = 130  # Approximate conversion rate

SCENARIO_MULTIPLIERS = {
    "conservative": {"rainfall": 0.75, "efficiency": 0.80, "capex": 1.15},
    "base":         {"rainfall": 1.00, "efficiency": 0.85, "capex": 1.00},
    "upside":       {"rainfall": 1.15, "efficiency": 0.90, "capex": 0.90},
}

def calc_harvestable_gallons(
    roof_area_sqft: float,
    annual_rainfall_in: float,
    efficiency: float = COLLECTION_EFFICIENCY,
) -> float:
    return roof_area_sqft * annual_rainfall_in * GAL_PER_SQFT_PER_INCH * efficiency

def calc_harvestable_m3(
    roof_area_m2: float,
    annual_rainfall_mm: float,
    efficiency: float = COLLECTION_EFFICIENCY,
) -> float:
    # Metric formula: Harvestable Volume (m³) = Roof Area (m²) × Annual Rainfall (mm) × Efficiency / 1000
    return roof_area_m2 * annual_rainfall_mm * efficiency / 1000

def calc_npv(annual_savings: float, capex: float, years: int = 10) -> float:
    npv = -capex
    for y in range(1, years + 1):
        npv += annual_savings / (1 + DISCOUNT_RATE) ** y
    return npv

def calc_scenario(building: BuildingRecord, scenario: str = "base") -> dict:
    m = SCENARIO_MULTIPLIERS[scenario]
    capex_mid = sum(building.system_capex_range) / 2

    # Convert to metric units for calculation
    roof_area_m2 = building.roof_area_sqft * 0.092903  # sqft to m²
    annual_rainfall_mm = building.annual_rainfall_in * 25.4  # inches to mm

    harvestable_m3 = calc_harvestable_m3(
        roof_area_m2,
        annual_rainfall_mm * m["rainfall"],
        efficiency=m["efficiency"],
    )

    # Convert back to gallons for API compatibility
    harvestable_gal = harvestable_m3 * 264.17  # m³ to gallons

    # Use Kenyan rates (in KSh/m³) - convert USD rates to KSh
    water_rate_ksh_m3 = DEFAULT_MUNICIPAL_WATER_RATE_KSH_M3
    sewer_rate_ksh_m3 = DEFAULT_SEWER_RATE_KSH_M3
    bowser_rate_ksh_m3 = DEFAULT_BOWSER_RATE_KSH_M3

    # Calculate savings in KSh
    water_savings_ksh = harvestable_m3 * water_rate_ksh_m3
    sewer_savings_ksh = harvestable_m3 * sewer_rate_ksh_m3 * DISCHARGE_FRACTION
    bowser_savings_ksh = harvestable_m3 * bowser_rate_ksh_m3  # Emergency supply offset

    # Convert to USD for API compatibility
    water_savings_usd = water_savings_ksh / USD_TO_KSH_CONVERSION
    sewer_savings_usd = sewer_savings_ksh / USD_TO_KSH_CONVERSION
    bowser_savings_usd = bowser_savings_ksh / USD_TO_KSH_CONVERSION

    stormwater_avoidance = building.stormwater_fee_usd_yr if building.stormwater_fee_active else 0.0
    incentive_annual = building.incentive_value_usd / 10
    total_savings  = water_savings_usd + sewer_savings_usd + bowser_savings_usd + stormwater_avoidance + incentive_annual

    capex          = capex_mid * m["capex"]
    payback        = capex / total_savings if total_savings else 0
    npv            = calc_npv(total_savings, capex)
    base_roi       = ((total_savings * 10) - capex) / capex * 100 if capex else 0.0
    adj_roi        = base_roi * building.cv_confidence_score
    co2_offset     = (harvestable_gal / 1000) * CO2_LBS_PER_KGAL

    return {
        "harvestable_gal":              int(harvestable_gal),
        "annual_water_savings_usd":     round(water_savings_usd, 2),
        "annual_sewer_savings_usd":     round(sewer_savings_usd, 2),
        "stormwater_fee_avoidance_usd": round(stormwater_avoidance, 2),
        "total_annual_savings_usd":     round(total_savings, 2),
        "capex_mid_usd":                round(capex, 2),
        "simple_payback_yrs":           round(payback, 1),
        "npv_10yr_usd":                 round(npv, 2),
        "base_roi_pct":                 round(base_roi, 1),
        "confidence_adj_roi_pct":       round(adj_roi, 1),
        "co2_offset_lbs":               int(co2_offset),
        "cv_confidence_pct":            int(building.cv_confidence_score * 100),
    }
