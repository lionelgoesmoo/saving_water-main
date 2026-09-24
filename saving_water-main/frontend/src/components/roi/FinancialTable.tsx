import React from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyKSh } from "@/lib/unitConversion";
import type { Scenario } from "./ScenarioToggle";

export interface ScenarioRow {
  harvestableGal: number;
  annualRainfallUsed: number;
  collectionEfficiencyPct: number;
  waterSavingsUsd: number;
  sewerSavingsUsd: number;
  stormwaterUsd: number;
  incentiveAmortUsd: number;
  totalSavingsUsd: number;
  capexMidUsd: number;
  incentiveUsd: number;
  netCapexUsd: number;
  paybackYrs: number;
  npv10yrUsd: number;
  baseRoiPct: number;
  confAdjRoiPct: number;
  co2OffsetLbs: number;
}

interface FinancialTableProps {
  data: Record<Scenario, ScenarioRow>;
  activeScenario: Scenario;
  cvConfidencePct: number;
}

function fmtUsd(n: number): string {
  return formatCurrencyKSh(n);
}

function fmtGal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M gal`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K gal`;
  return `${n.toLocaleString()} gal`;
}

const SCENARIO_COLS: { key: Scenario; label: string; multiplierBadge: string }[] = [
  { key: "conservative", label: "Conservative",  multiplierBadge: "×0.75 rain / −20% eff / +15% capex" },
  { key: "base",         label: "Base Case",      multiplierBadge: "30-yr avg / 85% eff / std capex" },
  { key: "upside",       label: "Upside",         multiplierBadge: "×1.15 rain / +5% eff / −10% capex" },
];

const ACTIVE_COL_BG: Record<Scenario, string> = {
  conservative: "bg-slate-50/80",
  base:         "bg-blue-50/60",
  upside:       "bg-emerald-50/60",
};

const ACTIVE_COL_HEADER: Record<Scenario, string> = {
  conservative: "text-slate-700 border-b-2 border-slate-300",
  base:         "text-blue-700 border-b-2 border-blue-400",
  upside:       "text-emerald-700 border-b-2 border-emerald-400",
};

type RowType = "section" | "row";

interface SectionRow { type: "section"; label: string }
interface DataRow {
  type: "row";
  label: string;
  render: (row: ScenarioRow) => string;
  highlight?: boolean;
  dimmed?: boolean;
}

type TableRow = SectionRow | DataRow;

const TABLE_ROWS: TableRow[] = [
  { type: "section", label: "Inputs & Assumptions" },
  { type: "row", label: "Annual Rainfall Used",      render: (r) => `${r.annualRainfallUsed.toFixed(1)}"` },
  { type: "row", label: "Collection Efficiency",     render: (r) => `${r.collectionEfficiencyPct}%` },
  { type: "row", label: "Harvestable Gallons / yr",  render: (r) => fmtGal(r.harvestableGal) },

  { type: "section", label: "Annual Savings" },
  { type: "row", label: "Water Savings",             render: (r) => fmtUsd(r.waterSavingsUsd) },
  { type: "row", label: "Sewer Savings",             render: (r) => fmtUsd(r.sewerSavingsUsd) },
  { type: "row", label: "Stormwater Avoidance",      render: (r) => fmtUsd(r.stormwaterUsd) },
  { type: "row", label: "Incentive (Amortized)",     render: (r) => fmtUsd(r.incentiveAmortUsd), dimmed: true },
  { type: "row", label: "Total Annual Savings",      render: (r) => fmtUsd(r.totalSavingsUsd) },

  { type: "section", label: "Capital" },
  { type: "row", label: "CapEx Midpoint",            render: (r) => fmtUsd(r.capexMidUsd) },
  { type: "row", label: "Incentive Value",           render: (r) => fmtUsd(r.incentiveUsd), dimmed: true },
  { type: "row", label: "Net CapEx",                 render: (r) => fmtUsd(r.netCapexUsd) },

  { type: "section", label: "Returns" },
  { type: "row", label: "Simple Payback",            render: (r) => `${r.paybackYrs.toFixed(2)} yrs` },
  { type: "row", label: "10-Year NPV",               render: (r) => fmtUsd(r.npv10yrUsd) },
  { type: "row", label: "Base ROI (10-yr)",          render: (r) => `${r.baseRoiPct.toFixed(1)}%` },
  { type: "row", label: "★ Conf-Adj ROI (10-yr)",   render: (r) => `${r.confAdjRoiPct.toFixed(1)}%`, highlight: true },
  { type: "row", label: "CO₂ Offset / yr",           render: (r) => `${(r.co2OffsetLbs / 1000).toFixed(1)}K lbs` },
];

export default function FinancialTable({ data, activeScenario, cvConfidencePct }: FinancialTableProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Detailed Financial Breakdown</h3>
          <p className="text-xs text-slate-500 mt-0.5">All three scenarios · CV confidence: {cvConfidencePct}%</p>
        </div>
        <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-xl px-2.5 py-1 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
          <span className="text-[11px] font-bold text-teal-700">★ = CV-adjusted differentiator</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <colgroup>
            <col className="w-[200px]" />
            <col />
            <col />
            <col />
          </colgroup>

          {/* Column headers */}
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                Metric
              </th>
              {SCENARIO_COLS.map(({ key, label, multiplierBadge }) => (
                <th
                  key={key}
                  className={cn(
                    "text-right px-4 py-3",
                    key === activeScenario ? ACTIVE_COL_HEADER[key] : "text-slate-400 border-b border-slate-100"
                  )}
                >
                  <div className={cn(
                    "text-xs font-bold",
                    key === activeScenario ? "" : "text-slate-500"
                  )}>
                    {label}
                    {key === activeScenario && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold align-middle">
                        active
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-normal mt-0.5 opacity-60 normal-case tracking-normal">
                    {multiplierBadge}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {TABLE_ROWS.map((row, idx) => {
              if (row.type === "section") {
                return (
                  <tr key={idx} className="bg-slate-50/60">
                    <td
                      colSpan={4}
                      className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              const isHighlight = row.highlight;
              const isDimmed = row.dimmed;

              return (
                <tr
                  key={idx}
                  className={cn(
                    "border-b border-slate-100/60 last:border-0 transition-colors duration-150 hover:bg-slate-50/40",
                    isHighlight ? "bg-teal-50/40" : ""
                  )}
                >
                  <td
                    className={cn(
                      "px-4 py-2.5",
                      isHighlight
                        ? "border-l-2 border-teal-500 font-bold text-teal-700 text-xs"
                        : isDimmed
                        ? "text-xs text-slate-400"
                        : "text-xs text-slate-600"
                    )}
                  >
                    {row.label}
                  </td>
                  {SCENARIO_COLS.map(({ key }) => {
                    const val = row.render(data[key]);
                    const isActive = key === activeScenario;
                    return (
                      <td
                        key={key}
                        className={cn(
                          "px-4 py-2.5 text-right font-mono tabular-nums",
                          isActive ? ACTIVE_COL_BG[key] : "",
                          isHighlight
                            ? isActive
                              ? "text-teal-700 font-bold text-sm"
                              : "text-teal-500 text-xs"
                            : isDimmed
                            ? "text-slate-400 text-xs"
                            : isActive
                            ? "text-slate-800 text-xs font-semibold"
                            : "text-slate-500 text-xs"
                        )}
                      >
                        {val}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center gap-2">
        <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
        <span className="text-[11px] text-slate-400">
          All values derived from pre-computed model. Conf-Adj ROI = Base ROI × {cvConfidencePct}% CV score. Site survey raises confidence, not lowers it.
        </span>
      </div>
    </div>
  );
}
