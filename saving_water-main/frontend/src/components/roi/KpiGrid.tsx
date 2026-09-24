import React from "react";
import { cn } from "@/lib/utils";
import { formatCurrencyKSh } from "@/lib/unitConversion";
import type { Scenario } from "./ScenarioToggle";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

export function KpiSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 animate-pulse shadow-sm">
            <div className="h-2 w-20 bg-slate-100 rounded" />
            <div className="h-7 w-24 bg-slate-100 rounded" />
            <div className="h-2 w-28 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5 animate-pulse">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-2.5 w-32 bg-teal-100 rounded" />
            <div className="h-3 w-48 bg-teal-100 rounded" />
            <div className="h-2 w-64 bg-teal-100 rounded" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-12 w-32 bg-teal-100 rounded" />
            <div className="h-2 w-24 bg-teal-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export interface RoiKpis {
  harvestableGal: number;
  annualSavingsUsd: number;
  capexMidUsd: number;
  paybackYrs: number;
  npv10yrUsd: number;
  baseRoiPct: number;
  confAdjRoiPct: number;
  co2OffsetLbs: number;
}

interface KpiGridProps {
  data: RoiKpis;
  scenario: Scenario;
  cvConfidencePct: number;
}

function fmtUsd(n: number): string {
  return formatCurrencyKSh(n);
}

function fmtGal(n: number): string {
  const m3 = Math.round(n * 0.00378541);
  if (m3 >= 1_000) return `${(m3 / 1000).toFixed(1)}K m³ (${(n / 1_000_000).toFixed(1)}M gal) / yr`;
  if (n >= 1_000) return `${m3.toLocaleString()} m³ (${Math.round(n / 1_000)}K gal) / yr`;
  return `${m3.toLocaleString()} m³ (${n.toLocaleString()} gal) / yr`;
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  variant?: "default" | "positive" | "warning";
}

function KpiCard({ label, value, sub, icon, variant = "default" }: KpiCardProps) {
  const valueColor =
    variant === "positive" ? "text-emerald-600" :
    variant === "warning"  ? "text-amber-600"  :
                             "text-slate-900";
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-4 flex flex-col gap-2 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {label}
        </span>
        {icon && <span className="text-slate-300">{icon}</span>}
      </div>
      <span className={cn("text-2xl font-black leading-none tabular-nums", valueColor)}>
        {value}
      </span>
      {sub && (
        <span className="text-xs text-slate-500 leading-snug">{sub}</span>
      )}
    </div>
  );
}

const SCENARIO_LABEL: Record<Scenario, string> = {
  conservative: "Conservative",
  base: "Base Case",
  upside: "Upside",
};

export default function KpiGrid({ data, scenario, cvConfidencePct }: KpiGridProps) {
  const paybackColor: KpiCardProps["variant"] =
    data.paybackYrs <= 3 ? "positive" :
    data.paybackYrs <= 5 ? "warning"  : "default";

  return (
    <div className="space-y-3">
      {/* ── Standard KPI row ────────────────────��──────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard
          label="Harvestable Water"
          value={fmtGal(data.harvestableGal)}
          sub="Annual capture, base efficiency"
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c-.5 2-2 3.5-2 5.5a2 2 0 0 0 4 0C14 5.5 12.5 4 12 2z M6 14c-.5 2-2 3.5-2 5.5a2 2 0 0 0 4 0C8 17.5 6.5 16 6 14z M18 14c-.5 2-2 3.5-2 5.5a2 2 0 0 0 4 0C20 17.5 18.5 16 18 14z" />
            </svg>
          }
        />
        <KpiCard
          label="Annual Savings"
          value={fmtUsd(data.annualSavingsUsd)}
          sub="Water + sewer + stormwater + incentive"
          variant="positive"
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          label="CapEx Midpoint"
          value={fmtUsd(data.capexMidUsd)}
          sub={`${SCENARIO_LABEL[scenario]} scenario`}
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          label="Payback Period"
          value={`${data.paybackYrs.toFixed(1)} yrs`}
          sub="Simple payback on net CapEx"
          variant={paybackColor}
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          label="10-Year NPV"
          value={fmtUsd(data.npv10yrUsd)}
          sub="5% discount rate"
          variant={data.npv10yrUsd > 0 ? "positive" : "default"}
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="16 7 22 7 22 13" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          label="Base ROI"
          value={`${data.baseRoiPct.toFixed(1)}%`}
          sub="10-yr horizon, pre-confidence adj."
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" strokeLinecap="round" />
              <path d="m19 9-5 5-4-4-3 3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          label="CO₂ Offset"
          value={`${(data.co2OffsetLbs / 1000).toFixed(1)}K lbs/yr`}
          sub="3.2 lbs per kgal avoided"
          icon={
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12a10 10 0 1 0 20 0A10 10 0 0 0 2 12z" />
              <path d="M12 8v4l3 3" strokeLinecap="round" />
            </svg>
          }
        />
      </div>

      {/* ── Featured: Confidence-Adjusted ROI ─────────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-teal-200/80 bg-gradient-to-br from-teal-50/80 to-white/60 backdrop-blur-sm shadow-lg shadow-teal-500/5 p-5">
        {/* Subtle glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-teal-50/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: label + explanation */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-widest text-teal-600">
                Core Differentiator
              </span>
              <span className="text-xs px-2 py-0.5 rounded-lg bg-teal-100 text-teal-700 font-bold border border-teal-200">
                CV-Adjusted
              </span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-wide text-teal-900 mb-2">
              Confidence-Adjusted ROI
            </h3>
            <p className="text-sm text-teal-700 leading-relaxed max-w-md">
              Satellite CV score ({cvConfidencePct}%) applied directly to the base ROI, making this the
              most conservative and credible figure in the brief. A site survey raises it, not lowers it.
            </p>
          </div>

          {/* Right: the big number */}
          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0">
            <div className="text-xs text-teal-600 font-bold uppercase tracking-wide">
              {SCENARIO_LABEL[scenario]} Scenario
            </div>
            <div className="flex items-end gap-1.5">
              <span className="text-5xl font-black text-teal-700 tabular-nums leading-none">
                {data.confAdjRoiPct.toFixed(1)}
              </span>
              <span className="text-3xl font-black text-teal-500 mb-0.5">%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-teal-600">CV</span>
                <div className="w-16 h-1.5 bg-teal-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"
                    style={{ width: `${cvConfidencePct}%` }}
                  />
                </div>
                <span className="text-xs text-teal-700 font-bold tabular-nums">{cvConfidencePct}%</span>
              </div>
              <span className="text-xs text-slate-500">confidence</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
