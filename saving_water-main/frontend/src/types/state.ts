export type ScoreBreakdown = {
  water_cost_pressure?: number;
  rainfall_capture?: number;
  commercial_density?: number;
  regulatory_pressure?: number;
  esg_alignment?: number;
  [key: string]: number | undefined;
};

export type MetroScore = {
  metro: string;
  state_code: string;
  country_code?: string;
  market_readiness_score: number;
  top_drivers: string[];
  candidate_count?: number;
};

export type StateScore = {
  state: string;
  state_code: string;
  country?: string;
  country_code?: string;
  market_readiness_score: number;
  top_drivers: string[];
  score_breakdown?: ScoreBreakdown;
  candidate_count?: number;
  metros: MetroScore[];
  // Pipeline-computed aggregate fields (from s06_score.py → state_scores.json)
  avg_roof_area_sqft?: number;
  pct_cooling_tower?: number;
  avg_annual_rainfall_in?: number;
  avg_annual_savings_usd?: number;
  top_building_score?: number;
};
