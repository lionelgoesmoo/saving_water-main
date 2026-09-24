export type BuildingCandidate = {
  building_id: string;
  address: string;
  lat: number;
  lng: number;
  metro: string;
  state: string;
  country?: string;
  country_code?: string;
  building_type: string;
  owner_tenant?: string;

  roof_area_sqft: number;
  roof_geometry: GeoJSON.Geometry;
  cooling_tower_present: boolean;
  cooling_tower_count: number;
  cv_confidence_score: number;
  imagery_date?: string;
  imagery_source?: string;
  imagery_url?: string;

  annual_rainfall_in: number;
  harvestable_gal_yr: number;
  drought_risk_index: number;
  flood_risk_index: number;
  water_restriction_active?: boolean;
  water_stress_tier?: string;

  water_rate_per_kgal: number;
  sewer_rate_per_kgal: number;
  annual_water_savings_usd: number;
  annual_sewer_savings_usd: number;
  incentive_value_usd: number;
  system_capex_range: [number, number];
  simple_payback_yrs: number;
  npv_10yr_usd: number;
  confidence_adj_roi_pct: number;

  stormwater_fee_active?: boolean;
  stormwater_fee_usd_yr?: number;
  state_incentive_type?: string;
  permit_pathway?: string;
  regulatory_urgency?: number;

  sbti_committed?: boolean;
  net_zero_pledge_yr?: number;
  leed_certified?: boolean;
  esg_score_proxy?: number;
  water_risk_in_10k?: boolean;
  sec_filing_snippet?: string;

  urgency_score: number;
  urgency_drivers: string[];
  recommended_angle: "cost_savings" | "resilience" | "compliance" | "esg_credibility";
  viability_score: number;
};
