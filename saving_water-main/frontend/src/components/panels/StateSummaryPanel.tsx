import React from "react";
import { SelectionState } from "../dashboard/ProspectingDashboard";
import { StateScore } from "@/types/state";
import { getOpportunityTier, aggregateStateMetrics, scoreStateOpportunity } from "@/lib/stateOpportunity";

import { formatRainfall } from "@/lib/unitConversion";

type Props = {
  selection: SelectionState;
  stateScores: StateScore[];
};

const BREAKDOWN_LABELS: Record<string, string> = {
  water_cost_pressure: "Water Cost Pressure",
  rainfall_capture:    "Rainfall Capture",
  commercial_density:  "Commercial Density",
  regulatory_pressure: "Regulatory Pressure",
  esg_alignment:       "ESG Alignment",
};

const DRIVER_COLORS = [
  "bg-blue-800/30 text-blue-300 border-blue-600/30",
  "bg-teal-800/30 text-teal-300 border-teal-600/30",
  "bg-sky-800/30 text-sky-300 border-sky-600/30",
  "bg-indigo-800/30 text-indigo-300 border-indigo-600/30",
];

function barColor(pct: number): string {
  if (pct >= 80) return "bg-blue-500";
  if (pct >= 60) return "bg-blue-400";
  if (pct >= 40) return "bg-teal-500";
  if (pct >= 20) return "bg-sky-400";
  return "bg-slate-500";
}

export default function StateSummaryPanel({ selection, stateScores }: Props) {
  const s = stateScores.find(
    x => x.state_code === selection.selectedState || x.state === selection.selectedState
  );

  if (!s) {
    return (
      <div
        className="rounded-2xl border border-white/[0.08] p-4 text-slate-500 text-xs"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        No data for this state.
      </div>
    );
  }

  const displayScore = scoreStateOpportunity(s);
  const { label, textClass } = getOpportunityTier(displayScore);
  const metrics = aggregateStateMetrics(s);

  return (
    <div className="space-y-3">
      {/* Header card */}
      <div
        className="rounded-2xl border border-white/[0.08] p-4"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
          Country Overview
        </p>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-100 leading-tight">{s.state}</h2>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold text-white leading-none">
              {Math.round(displayScore)}
            </div>
            <div className={`text-[10px] font-semibold uppercase tracking-wide mt-1 ${textClass}`}>
              {label}
            </div>
          </div>
        </div>

        {/* Top drivers */}
        {s.top_drivers.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
              Top Drivers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {s.top_drivers.map((d, i) => (
                <span
                  key={i}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border ${DRIVER_COLORS[i % DRIVER_COLORS.length]}`}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Key metrics */}
      <div
        className="rounded-2xl border border-white/[0.08] p-4"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
          Market Metrics
        </p>
        <div className="grid grid-cols-2 gap-3">
          <MetricCell
            label="Buildings"
            value={metrics.candidateCount.toLocaleString()}
          />
          {metrics.avgAnnualSavingsUsd != null && (
            <MetricCell
              label="Avg Annual Savings"
              value={`$${Math.round(metrics.avgAnnualSavingsUsd).toLocaleString()}`}
            />
          )}
          {metrics.avgAnnualRainfallIn != null && (
            <MetricCell
              label="Avg Rainfall"
              value={formatRainfall(metrics.avgAnnualRainfallIn)}
            />
          )}
          {metrics.topBuildingScore != null && (
            <MetricCell
              label="Top Building Score"
              value={`${Math.round(metrics.topBuildingScore)}`}
            />
          )}
        </div>
      </div>

      {/* Score breakdown bars */}
      {metrics.scoreBreakdown && (
        <div
          className="rounded-2xl border border-white/[0.08] p-4"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
            Score Breakdown
          </p>
          <div className="space-y-3">
            {Object.entries(metrics.scoreBreakdown).map(([key, val]) => {
              const pct = Math.min(100, Math.max(0, val));
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-slate-400">
                      {BREAKDOWN_LABELS[key] ?? key}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{val.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
      <div className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-1">{label}</div>
      <div className="text-sm font-bold text-slate-100 tabular-nums">{value}</div>
    </div>
  );
}
