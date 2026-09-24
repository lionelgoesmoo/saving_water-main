"use client";

import { use, useState, useEffect } from "react";
import BriefHeader from "@/components/brief/BriefHeader";
import SatellitePanel from "@/components/brief/SatellitePanel";
import BriefReport, { type BriefReportData, type FinancialKpi } from "@/components/brief/BriefReport";
import { fetchBuilding, fetchROI, fetchBrief } from "@/lib/api";
import { exportBriefPdf } from "@/lib/exportBrief";
import type { BuildingInfo, ROIResponse, BriefAPIResponse } from "@/types/roi";

// ─── Adapter: map backend response → BriefReportData ─────────────────────────

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtGal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M gal/yr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K gal/yr`;
  return `${n.toLocaleString()} gal/yr`;
}

function parseAssumptions(text: string): string[] {
  const byLine = text
    .split(/\n+/)
    .map((l) => l.replace(/^[\d\-\*\.]+\s*/, "").trim())
    .filter((l) => l.length > 15);
  if (byLine.length > 1) return byLine.slice(0, 6);
  return text
    .split(/\.\s+/)
    .filter((s) => s.length > 15)
    .map((s) => (s.endsWith(".") ? s : `${s}.`))
    .slice(0, 6);
}

function toReportData(
  brief: BriefAPIResponse,
  building: BuildingInfo,
  roi: ROIResponse
): BriefReportData {
  const cvPct = brief.confidence_caveats.cv_confidence_pct;
  const capexLow  = building.system_capex_range?.[0] ?? Math.round(roi.capex_mid_usd * 0.82);
  const capexHigh = building.system_capex_range?.[1] ?? Math.round(roi.capex_mid_usd * 1.18);
  const incentiveAmort = Math.max(
    0,
    roi.total_annual_savings_usd
      - roi.annual_water_savings_usd
      - roi.annual_sewer_savings_usd
      - roi.stormwater_fee_avoidance_usd
  );

  const kpis: FinancialKpi[] = [
    { label: "Harvestable Gallons", value: fmtGal(brief.physical_suitability.annual_capture_gal), sub: "Annual capture, base efficiency" },
    { label: "Annual Savings",      value: fmtUsd(roi.total_annual_savings_usd),                  sub: "Water + sewer + stormwater + incentive" },
    { label: "Simple Payback",      value: `${roi.simple_payback_yrs.toFixed(1)} yrs`,            sub: "After available incentives" },
    { label: "10-yr NPV",           value: fmtUsd(roi.npv_10yr_usd),                             sub: "5% discount rate" },
    { label: "Base ROI",            value: `${roi.base_roi_pct.toFixed(1)}%`,                    sub: "10-year horizon" },
    { label: "Confidence-Adj ROI",  value: `${roi.confidence_adj_roi_pct.toFixed(1)}%`,          sub: `Adjusted by ${cvPct}% CV confidence`, highlight: true },
    { label: "CO₂ Offset",          value: `${(roi.co2_offset_lbs / 1000).toFixed(1)}K lbs/yr`, sub: "3.2 lbs per kgal avoided" },
    { label: "CapEx Midpoint",      value: fmtUsd(roi.capex_mid_usd),                            sub: `Range: ${fmtUsd(capexLow)} – ${fmtUsd(capexHigh)}` },
  ];

  const esgBullets = [
    `CV confidence score of ${cvPct}% reflects satellite-derived detection certainty for physical signals including roof geometry${brief.physical_suitability.cooling_tower_detected ? " and cooling tower activity" : ""}.`,
    `CO₂ offset of ${(roi.co2_offset_lbs / 1000).toFixed(1)}K lbs/yr represents direct scope 3 emissions reduction via potable water demand avoidance.`,
    `10-year NPV of ${fmtUsd(roi.npv_10yr_usd)} at a 5% discount rate demonstrates durable financial value well beyond the initial payback horizon.`,
    ...(building.sbti_committed
      ? ["Building operator is publicly committed to Science Based Targets initiative (SBTi), requiring measurable water stewardship progress at the facility level."]
      : []),
  ];

  const nextStepOrder = (n: number) => building.incentive_value_usd > 0 ? String(n) : String(n - 1);

  return {
    generatedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    buildingRef: building.building_id.toUpperCase(),
    analyst: "Pluvial AI Engine",

    executiveSummary: brief.why_this_building_now,

    opportunityOverview: {
      headline: brief.recommended_sales_angle,
      bullets: [
        `${((brief.physical_suitability.roof_area_sqft ?? 0) / 1_000).toFixed(0)}K sqft roof yields approximately ${fmtGal(brief.physical_suitability.annual_capture_gal)} under base-case rainfall assumptions.`,
        `Annual combined savings of ${fmtUsd(roi.total_annual_savings_usd)} deliver a ${roi.simple_payback_yrs.toFixed(1)}-year payback — after applying a ${fmtUsd(building.incentive_value_usd)} available incentive.`,
        brief.physical_suitability.cooling_tower_detected
          ? `Cooling tower activity detected at ${cvPct}% CV confidence via satellite — the highest-leverage water consumption signal for blowdown substitution.`
          : `Roof surface geometry confirmed at ${cvPct}% CV confidence via satellite imagery — direct feed into rainwater reuse system.`,
        roi.stormwater_fee_avoidance_usd > 0
          ? `Stormwater fee avoidance of ${fmtUsd(roi.stormwater_fee_avoidance_usd)}/yr is captured independently of water/sewer savings, compressing payback further.`
          : `Water + sewer combined savings of ${fmtUsd(roi.annual_water_savings_usd + roi.annual_sewer_savings_usd)}/yr form the core financial driver — fully independent of incentive eligibility.`,
      ],
      context: `${building.metro}, ${building.state} · ${building.building_type.replace(/_/g, " ")} · ${building.annual_rainfall_in}" annual rainfall (NOAA 30-yr avg). Base-case scenario uses standard collection efficiency and current utility rate schedules.`,
    },

    financialSnapshot: {
      kpis,
      confidenceAdjRoiPct: roi.confidence_adj_roi_pct,
      cvConfidencePct: cvPct,
      savingsBreakdown: [
        { label: "Water savings",          usd: roi.annual_water_savings_usd },
        { label: "Sewer savings",          usd: roi.annual_sewer_savings_usd },
        { label: "Stormwater avoidance",   usd: roi.stormwater_fee_avoidance_usd },
        ...(incentiveAmort > 0 ? [{ label: "Incentive amortization", usd: incentiveAmort }] : []),
      ],
      capexRangeLow:  capexLow,
      capexRangeHigh: capexHigh,
      incentiveUsd:   building.incentive_value_usd,
    },

    esgResilience: {
      headline: brief.recommended_sales_angle.includes(".")
        ? brief.recommended_sales_angle.split(".")[0] + "."
        : brief.recommended_sales_angle,
      bullets: esgBullets,
      sbtiCommitted:    building.sbti_committed    ?? false,
      netZeroPledgeYr:  building.net_zero_pledge_yr,
      secFilingSnippet: building.sec_filing_snippet,
    },

    confidenceCaveats: {
      cvConfidencePct:      cvPct,
      keyAssumptions:       parseAssumptions(brief.confidence_caveats.key_assumptions),
      nextValidationStep:   brief.confidence_caveats.next_validation_step,
      disclaimer:
        "This brief was generated by the Pluvial AI engine using satellite-derived building data and public utility rate schedules. All financial projections are estimates based on parameterized models and should not be relied upon as engineering or financial advice. A qualified engineer should review all assumptions prior to commercial proposal.",
    },

    nextSteps: {
      steps: [
        { order: "1", action: "Schedule a physical site survey to confirm roof condition, drainage geometry, and cooling tower operational status", owner: "Account Executive", horizon: "Week 1–2" },
        { order: "2", action: "Pull 12-month utility billing history to validate water and sewer rate assumptions", owner: "AE + Customer", horizon: "Week 1" },
        ...(building.incentive_value_usd > 0
          ? [{ order: "3", action: "File incentive pre-application to reserve funding allocation — programs are first-come, first-served", owner: "Inside Sales", horizon: "Week 2–3" }]
          : []),
        { order: nextStepOrder(4), action: "Issue binding CapEx quote and updated brief based on site survey findings", owner: "Engineering", horizon: "Week 3–4" },
        { order: nextStepOrder(5), action: "Present final brief to decision-maker with confirmed numbers and binding proposal", owner: "AE + SE", horizon: "Week 4–6" },
      ],
      closingStatement: `This ${building.building_type.replace(/_/g, " ")} in ${building.metro} represents a ${roi.simple_payback_yrs <= 3 ? "high-urgency" : "strong"} opportunity: ${fmtUsd(roi.total_annual_savings_usd)}/yr in combined savings at a ${roi.simple_payback_yrs.toFixed(1)}-year payback. Moving to site survey is the single highest-value next action to convert this analysis into a binding proposal.`,
    },
  };
}

// ─── Loading / error states ─────────────────────────────────────────────────��─

function LeftPanelSkeleton() {
  return (
    <div className="flex flex-col h-full bg-slate-100/50 animate-pulse border-r border-slate-200">
      <div className="flex-1 bg-slate-200/50" />
      <div className="border-t border-slate-200 px-6 py-6 space-y-4">
        <div className="h-2.5 w-24 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-2 w-16 bg-slate-200 rounded" />
              <div className="h-6 w-12 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeftPanelError({ message }: { message: string }) {
  return (
    <div className="flex flex-col h-full bg-white items-center justify-center p-6 border-r border-slate-200">
      <svg className="w-8 h-8 text-red-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-slate-500 text-center leading-relaxed">{message}</p>
    </div>
  );
}

function BriefLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-24 px-8 bg-slate-50/50">
      {/* Animated ring */}
      <div className="relative w-16 h-16 mb-6">
        <svg className="w-16 h-16 animate-spin" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="4" />
          <path d="M32 4 a28 28 0 0 1 28 28" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        </div>
      </div>

      <h2 className="text-sm font-semibold text-slate-800 mb-2">Analyzing building data…</h2>
      <p className="text-xs text-slate-500 text-center max-w-xs leading-relaxed mb-6">
        The Pluvial AI engine is generating your investment brief.
        This typically takes 10–20 seconds.
      </p>

      <div className="space-y-2 w-full max-w-xs">
        {[
          "Retrieving satellite CV signals",
          "Running ROI scenario analysis",
          "Grounding with local water market data",
          "Drafting investment brief sections",
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div
              className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0 animate-pulse"
              style={{ animationDelay: `${i * 400}ms` }}
            />
            <span className="text-[11px] text-slate-400">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RightPanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isThrottled =
    message.toLowerCase().includes("unavailable") ||
    message.toLowerCase().includes("503") ||
    message.toLowerCase().includes("high demand");

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-24 px-8 bg-slate-50/50">
      <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-1">
              {isThrottled ? "AI model temporarily busy" : "Unable to generate brief"}
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              {isThrottled
                ? "The Gemini AI model is experiencing high demand right now. This is temporary — click \"Try again\" in a few seconds."
                : message}
            </p>
          </div>
        </div>
        <button
          onClick={onRetry}
          className="w-full py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-sm font-semibold text-red-700 transition-all duration-200"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BriefPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { buildingId } = use(params);

  const [building, setBuilding]         = useState<BuildingInfo | null>(null);
  const [roi, setRoi]                   = useState<ROIResponse | null>(null);
  const [brief, setBrief]               = useState<BriefAPIResponse | null>(null);
  const [buildingError, setBuildingError] = useState<string | null>(null);
  const [briefError, setBriefError]     = useState<string | null>(null);
  const [retryKey, setRetryKey]         = useState(0);

  useEffect(() => {
    let cancelled = false;

    setBuilding(null);
    setRoi(null);
    setBrief(null);
    setBuildingError(null);
    setBriefError(null);

    Promise.all([fetchBuilding(buildingId), fetchROI(buildingId, "base")])
      .then(([bld, r]) => {
        if (!cancelled) { setBuilding(bld); setRoi(r); }
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setBuildingError(e instanceof Error ? e.message : "Failed to load building data");
      });

    fetchBrief(buildingId)
      .then((b) => { if (!cancelled) setBrief(b); })
      .catch((e: unknown) => {
        if (!cancelled)
          setBriefError(e instanceof Error ? e.message : "Failed to generate investment brief");
      });

    return () => { cancelled = true; };
  }, [buildingId, retryKey]);

  const reportData = brief && roi && building ? toReportData(brief, building, roi) : null;

  const handleExport = reportData && building
    ? () => exportBriefPdf(reportData, {
        address:           building.address,
        metro:             building.metro,
        state:             building.state,
        buildingType:      building.building_type,
        viabilityScore:    building.viability_score,
        recommendedAngle:  building.recommended_angle,
      })
    : undefined;

  const headerBuilding = building ?? {
    address: buildingId,
    metro: "—", state: "—", building_type: "—",
    viability_score: 0,
    recommended_angle: "cost_savings" as const,
  };

  return (
    <div className="brief-page-root flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────── */}
      <BriefHeader
        address={headerBuilding.address}
        metro={headerBuilding.metro}
        state={headerBuilding.state}
        buildingType={headerBuilding.building_type}
        ownerTenant={"owner_tenant" in headerBuilding ? (headerBuilding as BuildingInfo).owner_tenant : undefined}
        viabilityScore={headerBuilding.viability_score}
        recommendedAngle={headerBuilding.recommended_angle}
        generatedAt={reportData?.generatedAt ?? "—"}
        buildingId={reportData?.buildingRef ?? buildingId.toUpperCase()}
        onExport={handleExport}
      />

      {/* ── Two-column body ───────────────────────────────────────── */}
      <div className="print-body flex flex-1 min-h-0 overflow-hidden">

        {/* Left — satellite / evidence panel (hidden in print) */}
        <div className="print-hide w-[380px] xl:w-[420px] shrink-0 flex flex-col border-r border-slate-200/60 overflow-hidden shadow-sm">
          {buildingError ? (
            <LeftPanelError message={buildingError} />
          ) : building ? (
            <SatellitePanel
              address={building.address}
              lat={building.lat}
              lng={building.lng}
              roofAreaSqft={building.roof_area_sqft ?? brief?.physical_suitability.roof_area_sqft ?? 0}
              coolingTowerCount={building.cooling_tower_count ?? 0}
              cvConfidencePct={Math.round(building.cv_confidence_score * 100)}
              urgencyScore={building.urgency_score ?? 7}
              imageryDate={building.imagery_date}
              imagerySource={building.imagery_source}
              imageryUrl={building.imagery_url}
            />
          ) : (
            <LeftPanelSkeleton />
          )}
        </div>

        {/* Right — report document */}
        <div className="brief-report-panel flex-1 overflow-y-auto bg-slate-50/60">
          {briefError ? (
            <RightPanelError
              message={briefError}
              onRetry={() => { setBriefError(null); setRetryKey((k) => k + 1); }}
            />
          ) : reportData ? (
            <div className="print-report-wrapper max-w-3xl mx-auto my-6 shadow-lg rounded-2xl overflow-hidden border border-slate-200/60">
              <BriefReport data={reportData} />
            </div>
          ) : (
            <BriefLoadingState />
          )}
        </div>
      </div>
    </div>
  );
}
