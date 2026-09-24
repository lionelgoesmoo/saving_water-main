import React from "react";
import BriefSection from "./BriefSection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinancialKpi {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean; // for confidence-adj ROI card
}

export interface BriefReportData {
  generatedAt: string;
  buildingRef: string;
  analyst: string;

  executiveSummary: string;

  opportunityOverview: {
    headline: string;
    bullets: string[];
    context: string;
  };

  financialSnapshot: {
    kpis: FinancialKpi[];
    confidenceAdjRoiPct: number;
    cvConfidencePct: number;
    savingsBreakdown: { label: string; usd: number }[];
    capexRangeLow: number;
    capexRangeHigh: number;
    incentiveUsd: number;
  };

  esgResilience: {
    headline: string;
    bullets: string[];
    sbtiCommitted: boolean;
    netZeroPledgeYr?: number;
    secFilingSnippet?: string;
  };

  confidenceCaveats: {
    cvConfidencePct: number;
    keyAssumptions: string[];
    nextValidationStep: string;
    disclaimer: string;
  };

  nextSteps: {
    steps: { order: string; action: string; owner: string; horizon: string }[];
    closingStatement: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ kpi }: { kpi: FinancialKpi }) {
  return (
    <div
      className={`
        print-no-break rounded-xl border px-4 py-4 flex flex-col gap-2 shadow-sm transition-all duration-200 hover:shadow-md
        ${kpi.highlight
          ? "bg-teal-50/80 border-teal-200 backdrop-blur-sm"
          : "bg-white/80 border-slate-200/70 backdrop-blur-sm"
        }
      `}
    >
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
        {kpi.label}
      </span>
      <span
        className={`text-2xl font-black leading-none tabular-nums ${
          kpi.highlight ? "text-teal-700" : "text-slate-900"
        }`}
      >
        {kpi.value}
      </span>
      {kpi.sub && (
        <span
          className={`text-xs ${
            kpi.highlight ? "text-teal-600 font-medium" : "text-slate-500"
          }`}
        >
          {kpi.sub}
        </span>
      )}
    </div>
  );
}

function SavingsBar({
  label,
  usd,
  total,
}: {
  label: string;
  usd: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((usd / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-500 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-700 w-16 text-right tabular-nums">
        {fmtUsd(usd)}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BriefReport({ data }: { data: BriefReportData }) {
  const totalSavings = data.financialSnapshot.savingsBreakdown.reduce(
    (acc, s) => acc + s.usd,
    0
  );

  return (
    <div className="bg-white/95 backdrop-blur-sm min-h-full">

      {/* ── Document header ─────────────────────────────────── */}
      <div className="px-8 pt-8 pb-6 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Rainwater Reuse Systems
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Prospect Analysis
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
              AI Investment Brief
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Prepared by {data.analyst} · {data.generatedAt}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">Ref</div>
            <div className="text-sm font-mono font-semibold text-slate-600">{data.buildingRef}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">AI-Generated</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Report body ─────────────────────────────────────── */}
      <div className="px-8 py-2">

        {/* 01 — Executive Summary */}
        <BriefSection number="01" title="Executive Summary" accent="teal">
          <p className="text-sm text-slate-700 leading-relaxed">
            {data.executiveSummary}
          </p>
        </BriefSection>

        {/* 02 — Opportunity Overview */}
        <BriefSection number="02" title="Opportunity Overview" accent="blue">
          <p className="text-sm font-semibold text-slate-800 mb-3">
            {data.opportunityOverview.headline}
          </p>
          <ul className="space-y-2 mb-4">
            {data.opportunityOverview.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <div className="bg-slate-50/80 border border-slate-100 rounded-xl px-4 py-3 backdrop-blur-sm">
            <p className="text-xs text-slate-500 leading-relaxed italic">
              {data.opportunityOverview.context}
            </p>
          </div>
        </BriefSection>

        {/* 03 — Financial Snapshot */}
        <BriefSection number="03" title="Financial Snapshot" accent="emerald">

          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
            {data.financialSnapshot.kpis.map((kpi) => (
              <KpiCard key={kpi.label} kpi={kpi} />
            ))}
          </div>

          {/* Confidence-adjusted ROI callout */}
          <div className="print-no-break bg-teal-50/80 border border-teal-200 rounded-xl px-5 py-4 mb-5 flex items-start gap-4 backdrop-blur-sm shadow-sm">
            <div className="shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-teal-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A8 8 0 0 1 4.07 9h.07a1 1 0 0 1 0 2A6 6 0 0 0 11 16.93zM12 7a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-teal-800 mb-0.5">
                Core Differentiator: Confidence-Adjusted ROI
              </p>
              <p className="text-sm text-teal-700 leading-relaxed">
                The{" "}
                <strong className="text-teal-900">
                  {data.financialSnapshot.confidenceAdjRoiPct.toFixed(1)}% confidence-adjusted ROI
                </strong>{" "}
                ties the satellite CV detection score ({data.financialSnapshot.cvConfidencePct}% confidence)
                directly to the financial model. This figure is inherently conservative — it accounts for
                uncertainty in roof condition and cooling tower activity. A site survey can raise this
                number, not lower it.
              </p>
            </div>
          </div>

          {/* Savings breakdown */}
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Annual Savings Breakdown
            </p>
            <div className="space-y-3">
              {data.financialSnapshot.savingsBreakdown.map((s) => (
                <SavingsBar key={s.label} label={s.label} usd={s.usd} total={totalSavings} />
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                <span className="text-sm font-semibold text-slate-800">Total Annual Savings</span>
                <span className="text-xl font-black text-emerald-600 tabular-nums">{fmtUsd(totalSavings)}</span>
              </div>
            </div>
          </div>

          {/* CapEx + incentive row */}
          <div className="print-no-break grid grid-cols-3 gap-3">
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-center backdrop-blur-sm shadow-sm">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 font-bold">CapEx Range</div>
              <div className="text-sm font-bold text-slate-900 tabular-nums">
                {fmtUsd(data.financialSnapshot.capexRangeLow)}
                {" – "}
                {fmtUsd(data.financialSnapshot.capexRangeHigh)}
              </div>
            </div>
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl px-3 py-3 text-center backdrop-blur-sm shadow-sm">
              <div className="text-[10px] uppercase tracking-widest text-emerald-500 mb-1.5 font-bold">Incentive Value</div>
              <div className="text-sm font-bold text-emerald-700 tabular-nums">
                {fmtUsd(data.financialSnapshot.incentiveUsd)}
              </div>
            </div>
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl px-3 py-3 text-center backdrop-blur-sm shadow-sm">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1.5 font-bold">Net CapEx</div>
              <div className="text-sm font-bold text-slate-700 tabular-nums">
                {fmtUsd(
                  ((data.financialSnapshot.capexRangeLow + data.financialSnapshot.capexRangeHigh) / 2) -
                    data.financialSnapshot.incentiveUsd
                )}
              </div>
            </div>
          </div>
        </BriefSection>

        {/* 04 — ESG / Resilience */}
        <BriefSection number="04" title="ESG / Resilience Context" accent="purple">
          <p className="text-sm font-semibold text-slate-800 mb-3">
            {data.esgResilience.headline}
          </p>
          <ul className="space-y-2 mb-4">
            {data.esgResilience.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          {(data.esgResilience.sbtiCommitted || data.esgResilience.netZeroPledgeYr) && (
            <div className="flex items-center gap-2.5 flex-wrap mb-4">
              {data.esgResilience.sbtiCommitted && (
                <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">SBTi Committed</span>
                </div>
              )}
              {data.esgResilience.netZeroPledgeYr && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 shadow-sm">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Net Zero target: {data.esgResilience.netZeroPledgeYr}
                  </span>
                </div>
              )}
            </div>
          )}
          {data.esgResilience.secFilingSnippet && (
            <div className="border-l-2 border-purple-300 pl-4 py-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                SEC 10-K / ESG Filing Excerpt
              </p>
              <p className="text-sm text-slate-600 italic leading-relaxed">
                "{data.esgResilience.secFilingSnippet}"
              </p>
            </div>
          )}
        </BriefSection>

        {/* 05 — Confidence & Caveats */}
        <BriefSection number="05" title="Confidence & Caveats" accent="amber">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${data.confidenceCaveats.cvConfidencePct}%` }}
              />
            </div>
            <span className="text-sm font-black text-amber-600 shrink-0 tabular-nums">
              {data.confidenceCaveats.cvConfidencePct}% CV confidence
            </span>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Key Assumptions
          </p>
          <ul className="space-y-1.5 mb-4">
            {data.confidenceCaveats.keyAssumptions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                {a}
              </li>
            ))}
          </ul>

          <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-4 py-3 mb-3 backdrop-blur-sm shadow-sm">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">
              Next Validation Step
            </p>
            <p className="text-sm text-amber-700 leading-relaxed">
              {data.confidenceCaveats.nextValidationStep}
            </p>
          </div>

          <p className="text-[10px] text-slate-400 italic leading-relaxed">
            {data.confidenceCaveats.disclaimer}
          </p>
        </BriefSection>

        {/* 06 — Recommended Next Steps */}
        <BriefSection number="06" title="Recommended Next Steps" accent="rose">
          <div className="space-y-2.5 mb-5">
            {data.nextSteps.steps.map((step) => (
              <div
                key={step.order}
                className="print-no-break flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-200"
              >
                <div className="shrink-0 w-7 h-7 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-black text-rose-600">{step.order}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{step.action}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">{step.owner}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-[10px] font-semibold text-rose-500">{step.horizon}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="print-no-break print-no-break-before bg-slate-900 rounded-2xl px-5 py-5 shadow-lg">
            <p className="text-sm text-slate-300 leading-relaxed italic">
              {data.nextSteps.closingStatement}
            </p>
          </div>
        </BriefSection>
      </div>

      {/* ── Document footer ─────────────────────────────────── */}
      <div className="px-8 py-5 border-t border-slate-100 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-slate-300 font-mono">
            Pluvial · AI Investment Brief · {data.buildingRef}
          </span>
          <span className="text-[9px] text-slate-300">
            Generated {data.generatedAt} · Pre-validation draft
          </span>
        </div>
      </div>
    </div>
  );
}
