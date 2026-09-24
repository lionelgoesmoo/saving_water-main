# models.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional

_VALID_ANGLES = {"cost_savings", "resilience", "compliance", "esg_credibility"}

# ── Input from buildings.json ──────────────────────────────────────────────

class BuildingRecord(BaseModel):
    building_id: str
    address: str
    state: str
    metro: str
    building_type: str
    owner_tenant: Optional[str] = None

    lat: float = 0.0
    lng: float = 0.0

    roof_area_sqft: float
    cooling_tower_present: bool
    cooling_tower_count: int = 0
    cv_confidence_score: float = Field(ge=0.0, le=1.0)

    imagery_url: Optional[str] = None
    imagery_date: Optional[str] = None
    imagery_source: Optional[str] = None

    annual_rainfall_in: float
    water_rate_per_kgal: float
    sewer_rate_per_kgal: float
    stormwater_fee_active: bool = False
    stormwater_fee_usd_yr: float = 0.0
    incentive_value_usd: float = 0.0
    system_capex_range: tuple[float, float]

    sbti_committed: bool = False
    net_zero_pledge_yr: Optional[int] = None
    leed_certified: bool = False
    water_risk_in_10k: bool = False
    sec_filing_snippet: Optional[str] = None
    drought_risk_index: float = 0.0

    urgency_score: int = Field(ge=1, le=10)
    urgency_drivers: list[str] = Field(default_factory=list)
    recommended_angle: str
    viability_score: float

    # ── Validators: clamp / normalise instead of rejecting ────────────────

    @field_validator("address", "metro", mode="before")
    @classmethod
    def coerce_str(cls, v: object) -> str:
        """Coerce NaN (pandas float) or None to empty string."""
        if v is None:
            return ""
        if isinstance(v, float) and v != v:  # NaN check
            return ""
        return str(v)

    @field_validator("cv_confidence_score", mode="before")
    @classmethod
    def clamp_cv_score(cls, v: object) -> float:
        """Clamp to [0, 1] so floating-point edge cases (e.g. 1.0000001) don't crash startup."""
        return max(0.0, min(1.0, float(v)))  # type: ignore[arg-type]

    @field_validator("urgency_score", mode="before")
    @classmethod
    def clamp_urgency(cls, v: object) -> int:
        """Clamp to [1, 10] so out-of-range pipeline values don't crash startup."""
        return max(1, min(10, int(v)))  # type: ignore[arg-type]

    @field_validator("recommended_angle", mode="before")
    @classmethod
    def normalise_angle(cls, v: object) -> str:
        """Default to 'cost_savings' for any unrecognised sales angle string."""
        return v if v in _VALID_ANGLES else "cost_savings"

    @field_validator("system_capex_range", mode="after")
    @classmethod
    def order_capex_range(cls, v: tuple[float, float]) -> tuple[float, float]:
        """Swap inverted ranges so roi_engine always gets (low, high)."""
        return v if v[0] <= v[1] else (v[1], v[0])

# ── ROI request / response ─────────────────────────────────────────────────

class ROIRequest(BaseModel):
    building_id: str
    scenario: str = "base"  # conservative | base | upside

class ROIResponse(BaseModel):
    building_id: str
    scenario: str
    harvestable_gal: int
    annual_water_savings_usd: float
    annual_sewer_savings_usd: float
    stormwater_fee_avoidance_usd: float
    total_annual_savings_usd: float
    capex_mid_usd: float
    simple_payback_yrs: float
    npv_10yr_usd: float
    base_roi_pct: float
    confidence_adj_roi_pct: float
    co2_offset_lbs: int
    cv_confidence_pct: int

# ── Brief request / response ───────────────────────────────────────────────

class BriefRequest(BaseModel):
    building_id: str

class ProspectSummary(BaseModel):
    address: str
    metro_state: str
    building_type: str
    viability_score: float

class PhysicalSuitability(BaseModel):
    roof_area_sqft: int
    cooling_tower_detected: bool
    cv_confidence_pct: int
    annual_capture_gal: int

class FinancialSnapshot(BaseModel):
    total_annual_savings_usd: int
    simple_payback_yrs: float
    npv_10yr_usd: int
    confidence_adj_roi_pct: float
    incentive_flags: str

class ConfidenceCaveats(BaseModel):
    cv_confidence_pct: int
    key_assumptions: str
    next_validation_step: str

class BriefResponse(BaseModel):
    prospect_summary: ProspectSummary
    physical_suitability: PhysicalSuitability
    financial_snapshot: FinancialSnapshot
    why_this_building_now: str
    recommended_sales_angle: str
    confidence_caveats: ConfidenceCaveats
