export type BriefResult = {
  building_id: string;
  title: string;
  executive_summary: string;
  key_metrics: {
    roi: string;
    payback: string;
    water_savings: string;
  };
  recommended_angle: string;
  pitch_script: string;
  risks_and_mitigation: string[];
};
