// Legacy type used by map panel (RoiPreviewPanel) — do not remove
export type RoiResult = {
  annual_harvestable_gal: number;
  annual_water_savings_usd: number;
  annual_sewer_savings_usd: number;
  capex_range: [number, number];
  payback_yrs: number;
  npv_10yr_usd: number;
  base_roi_percent: number;
  confidence_adj_roi_percent: number;
};

// Backend POST /roi response — mirrors models.py ROIResponse exactly
export type ROIResponse = {
  building_id: string;
  scenario: string;
  harvestable_gal: number;
  annual_water_savings_usd: number;
  annual_sewer_savings_usd: number;
  stormwater_fee_avoidance_usd: number;
  total_annual_savings_usd: number;
  capex_mid_usd: number;
  simple_payback_yrs: number;
  npv_10yr_usd: number;
  base_roi_pct: number;
  confidence_adj_roi_pct: number;
  co2_offset_lbs: number;
  cv_confidence_pct: number;
};

// Building fields returned by GET /buildings/{id} (full BuildingRecord)
// Optional fields degrade gracefully for fallback objects in page headers
export type BuildingInfo = {
  building_id: string;
  address: string;
  metro: string;
  state: string;
  building_type: string;
  owner_tenant?: string;
  viability_score: number;
  recommended_angle: "cost_savings" | "resilience" | "compliance" | "esg_credibility";
  annual_rainfall_in: number;
  incentive_value_usd: number;
  cv_confidence_score: number;
  // Physical / satellite — used by SatellitePanel and brief adapter
  lat?: number;
  lng?: number;
  roof_area_sqft?: number;
  cooling_tower_count?: number;
  urgency_score?: number;
  imagery_url?: string;
  imagery_date?: string;
  imagery_source?: string;
  // Financial — used by brief adapter for CapEx range display
  system_capex_range?: [number, number];
  // ESG — used by brief adapter for resilience section
  sbti_committed?: boolean;
  net_zero_pledge_yr?: number;
  sec_filing_snippet?: string;
};

// Backend POST /brief response — mirrors models.py BriefResponse exactly
export type BriefAPIResponse = {
  prospect_summary: {
    address: string;
    metro_state: string;
    building_type: string;
    viability_score: number;
  };
  physical_suitability: {
    roof_area_sqft: number;
    cooling_tower_detected: boolean;
    cv_confidence_pct: number;
    annual_capture_gal: number;
  };
  financial_snapshot: {
    total_annual_savings_usd: number;
    simple_payback_yrs: number;
    npv_10yr_usd: number;
    confidence_adj_roi_pct: number;
    incentive_flags: string;
  };
  why_this_building_now: string;
  recommended_sales_angle: string;
  confidence_caveats: {
    cv_confidence_pct: number;
    key_assumptions: string;
    next_validation_step: string;
  };
};
