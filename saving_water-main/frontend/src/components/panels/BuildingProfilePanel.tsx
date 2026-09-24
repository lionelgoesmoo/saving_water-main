import React from "react";
import { SelectionState } from "../dashboard/ProspectingDashboard";
import CvEvidencePanel from "./CvEvidencePanel";
import { BuildingCandidate } from "@/types/building";

type Props = {
  selection: SelectionState;
  filteredBuildings: BuildingCandidate[];
  isCalculatingRoi: boolean;
  onCalculateRoi: (building: BuildingCandidate) => void;
  isGeneratingBrief: boolean;
  onGenerateBrief: (building: BuildingCandidate) => void;
};

const ANGLE_STYLES: Record<BuildingCandidate["recommended_angle"], { badge: string; label: string }> = {
  cost_savings:    { badge: "bg-teal-500/20 text-teal-300 border-teal-500/30",    label: "Cost Savings" },
  resilience:      { badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",    label: "Resilience" },
  compliance:      { badge: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Compliance" },
  esg_credibility: { badge: "bg-purple-500/20 text-purple-300 border-purple-500/30", label: "ESG Credibility" },
};

const DRIVER_COLORS = [
  "text-orange-400",
  "text-amber-400",
  "text-emerald-400",
  "text-blue-400",
  "text-rose-400",
];

import { formatArea, formatRainfall, formatVolume, formatWaterRate } from "@/lib/unitConversion";

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-200">{value}</span>
    </div>
  );
}

export default function BuildingProfilePanel({
  selection, filteredBuildings, isCalculatingRoi, onCalculateRoi, isGeneratingBrief, onGenerateBrief,
}: Props) {
  const building = filteredBuildings.find(b => b.building_id === selection.selectedBuildingId);
  if (!building) return <div className="p-4 text-slate-500 text-xs">No building selected.</div>;

  const angle = ANGLE_STYLES[building.recommended_angle] ?? ANGLE_STYLES["cost_savings"];
  const cvPct = Math.round(building.cv_confidence_score * 100);
  const cvColor = cvPct >= 90 ? "text-emerald-400" : cvPct >= 70 ? "text-amber-400" : "text-red-400";

  return (
    <div className="flex flex-col">

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-100 truncate">
              {building.address?.trim() ? building.address.split(",")[0] : `${building.building_type.replace(/_/g, " ")} · ${building.metro}`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {building.metro}, {building.state} • {building.building_type.replace(/_/g, " ")}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-black text-white leading-none">{building.viability_score}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Viability</div>
          </div>
        </div>

        {/* Detection confidence + angle */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1 border border-white/[0.08]"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-slate-400 font-medium">Detection:</span>
            <span className={`text-[11px] font-black ${cvColor}`}>{cvPct}%</span>
          </div>
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg border ${angle.badge}`}>
            {angle.label}
          </span>
        </div>
      </div>

      {/* ── Agency Drivers ───────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Agency Drivers</p>
        <ul className="space-y-1">
          {building.urgency_drivers.map((d, i) => (
            <li key={i} className={`text-xs font-medium flex items-start gap-1.5 ${DRIVER_COLORS[i % DRIVER_COLORS.length]}`}>
              <span className="mt-1.5 w-1 h-1 rounded-full bg-current shrink-0" />
              {d}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Physical ─────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Physical</p>
        <MetricRow label="Roof Area"        value={formatArea(building.roof_area_sqft, true)} />
        <MetricRow label="Annual Rainfall"  value={formatRainfall(building.annual_rainfall_in)} />
        <MetricRow label="Harvestable"      value={formatVolume(building.harvestable_gal_yr, true)} />
        <MetricRow label="Drought Risk"     value={`${building.drought_risk_index} / 100 (${building.water_stress_tier || "Elevated"})`} />
        <MetricRow
          label="Cooling Towers"
          value={building.cooling_tower_present ? `${building.cooling_tower_count} detected` : "None"}
        />
      </div>

      {/* ── Financial Snapshot ───────────────────────────────── */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">Financial Snapshot</p>
        <MetricRow label="Water Tariff"          value={formatWaterRate(building.water_rate_per_kgal)} />
        <MetricRow label="Annual Water Savings"  value={fmtUsd(building.annual_water_savings_usd)} />
        <MetricRow label="Annual Sewer Savings"  value={fmtUsd(building.annual_sewer_savings_usd)} />
        <MetricRow label="Incentive Value"        value={fmtUsd(building.incentive_value_usd)} />
        <MetricRow
          label="CapEx Range"
          value={`${fmtUsd(building.system_capex_range[0])} — ${fmtUsd(building.system_capex_range[1])}`}
        />
        <MetricRow label="Simple Payback"        value={building.simple_payback_yrs != null ? `${building.simple_payback_yrs.toFixed(1)} yrs` : "N/A"} />
        <MetricRow label="10yr NPV"               value={building.npv_10yr_usd != null ? fmtUsd(building.npv_10yr_usd) : "N/A"} />
        <MetricRow label="Confidence-Adj ROI"    value={building.confidence_adj_roi_pct != null ? `${building.confidence_adj_roi_pct.toFixed(1)}%` : "N/A"} />
      </div>

      {/* ── CV Evidence metadata ─────────────────────────────── */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <CvEvidencePanel building={building} />
      </div>

      {/* ── Actions ──────────────────────────────────────────── */}
      <div className="px-4 py-4 space-y-2">
        <button
          onClick={() => onCalculateRoi(building)}
          disabled={isCalculatingRoi}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-blue-600/20 border border-blue-500/50"
        >
          {isCalculatingRoi ? "Calculating..." : "Analyze ROI"}
        </button>
        <button
          onClick={() => onGenerateBrief(building)}
          disabled={isGeneratingBrief}
          className="w-full py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-slate-300 transition-all duration-200 border border-white/10 hover:border-white/20 hover:text-white"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          {isGeneratingBrief ? "Generating..." : "Generate Brief"}
        </button>
      </div>
    </div>
  );
}
