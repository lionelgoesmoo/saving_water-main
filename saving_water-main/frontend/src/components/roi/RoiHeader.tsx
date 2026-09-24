"use client";

import React from "react";
import Link from "next/link";

type RecommendedAngle = "cost_savings" | "resilience" | "compliance" | "esg_credibility";
type Scenario = "conservative" | "base" | "upside";

interface RoiHeaderProps {
  buildingId: string;
  address: string;
  metro: string;
  state: string;
  buildingType: string;
  ownerTenant?: string;
  viabilityScore: number;
  recommendedAngle: RecommendedAngle;
  scenario: Scenario;
}

const ANGLE: Record<RecommendedAngle, { badge: string; label: string }> = {
  cost_savings:    { badge: "bg-teal-50 text-teal-700 border-teal-200",       label: "Cost Savings" },
  resilience:      { badge: "bg-blue-50 text-blue-700 border-blue-200",       label: "Resilience" },
  compliance:      { badge: "bg-amber-50 text-amber-700 border-amber-200",    label: "Compliance" },
  esg_credibility: { badge: "bg-purple-50 text-purple-700 border-purple-200", label: "ESG Credibility" },
};

const SCENARIO_LABEL: Record<Scenario, string> = {
  conservative: "Conservative",
  base: "Base Case",
  upside: "Upside",
};

const SCENARIO_COLORS: Record<Scenario, string> = {
  conservative: "bg-slate-100 text-slate-700 border-slate-200",
  base:         "bg-blue-50 text-blue-700 border-blue-200",
  upside:       "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const VIABILITY_COLOR = (score: number) =>
  score >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
  score >= 60 ? "text-blue-700 bg-blue-50 border-blue-200" :
  score >= 40 ? "text-amber-700 bg-amber-50 border-amber-200" :
               "text-red-700 bg-red-50 border-red-200";

export default function RoiHeader({
  buildingId,
  address,
  metro,
  state,
  buildingType,
  ownerTenant,
  viabilityScore,
  recommendedAngle,
  scenario,
}: RoiHeaderProps) {
  const angle = ANGLE[recommendedAngle];
  const viabilityClasses = VIABILITY_COLOR(viabilityScore);
  const streetAddress = address.split(",")[0];

  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">

      {/* ── Nav strip ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Link
            href="/map"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors duration-200 group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back to Map</span>
          </Link>
          <span className="text-slate-200">·</span>
          <div className="flex items-center gap-2">
            <img src="/assets/Hand Holding Water Droplet.png" alt="Pluvial" className="w-16 h-16 object-contain" />
            <span className="text-sm font-black tracking-tight bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">Pluvial</span>
            <span className="text-sm text-slate-400">/ ROI Analysis</span>
          </div>
        </div>

        {/* Active scenario pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold shadow-sm ${SCENARIO_COLORS[scenario]}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {SCENARIO_LABEL[scenario]} Scenario
        </div>
      </div>

      {/* ── Building identity ────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">
              {streetAddress}
            </h1>
            {ownerTenant && (
              <span className="text-base text-slate-500 font-medium shrink-0">{ownerTenant}</span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {metro}, {state}
            <span className="mx-2 text-slate-300">·</span>
            <span className="capitalize">{buildingType.replace(/_/g, " ")}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-bold shadow-sm ${viabilityClasses}`}>
            <span>{viabilityScore}</span>
            <span className="text-xs font-semibold uppercase tracking-wide opacity-75">Viability</span>
          </div>
          <div className={`px-3 py-2 rounded-xl border text-sm font-medium shadow-sm ${angle.badge}`}>
            {angle.label}
          </div>
          <Link
            href={`/brief/${buildingId}`}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            View Brief
          </Link>
        </div>
      </div>
    </div>
  );
}
