import type { BriefReportData, FinancialKpi } from "@/components/brief/BriefReport";

// ─── Public API ───────────────────────────────────────────────────────────────

export interface BriefBuildingIdentity {
  address: string;
  metro: string;
  state: string;
  buildingType: string;
  viabilityScore: number;
  recommendedAngle: "cost_savings" | "resilience" | "compliance" | "esg_credibility";
}

export function exportBriefPdf(
  data: BriefReportData,
  building: BriefBuildingIdentity
): void {
  const popup = window.open("", "_blank", "width=960,height=750");
  if (!popup) {
    alert("Popup blocked. Please allow popups for this site to export PDF.");
    return;
  }

  popup.document.write(buildHtml(data, building));
  popup.document.close();

  const doPrint = () => {
    popup.focus();
    popup.print();
    // Close after user dismisses the print dialog
    popup.addEventListener("afterprint", () => popup.close());
  };

  if (popup.document.readyState === "complete") {
    setTimeout(doPrint, 300);
  } else {
    popup.onload = () => setTimeout(doPrint, 300);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ANGLE_LABELS: Record<BriefBuildingIdentity["recommendedAngle"], string> = {
  cost_savings:    "Cost Savings",
  resilience:      "Resilience",
  compliance:      "Compliance",
  esg_credibility: "ESG Credibility",
};

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

/** Minimal HTML entity escaping — prevents XSS in generated document */
function e(s: string | number): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildHtml(data: BriefReportData, building: BriefBuildingIdentity): string {
  const { financialSnapshot: fs, opportunityOverview: oo,
          esgResilience: esg, confidenceCaveats: cc, nextSteps: ns } = data;

  const totalSavings = fs.savingsBreakdown.reduce((acc, s) => acc + s.usd, 0);
  const netCapex = ((fs.capexRangeLow + fs.capexRangeHigh) / 2) - fs.incentiveUsd;
  const angleLabel = ANGLE_LABELS[building.recommendedAngle] ?? building.recommendedAngle;
  const streetAddr = building.address.split(",")[0];

  // ── KPI cards ───────────────────────────────────────────────────────────────
  const kpiCards = fs.kpis.map((kpi: FinancialKpi) => {
    const bg      = kpi.highlight ? "#f0fdfa" : "#ffffff";
    const border  = kpi.highlight ? "#99f6e4" : "#e2e8f0";
    const valClr  = kpi.highlight ? "#0f766e" : "#0f172a";
    const subClr  = kpi.highlight ? "#0d9488" : "#64748b";
    return `
    <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:13px 15px;display:flex;flex-direction:column;gap:5px;break-inside:avoid;">
      <span style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">${e(kpi.label)}</span>
      <span style="font-size:19px;font-weight:900;color:${valClr};line-height:1;font-variant-numeric:tabular-nums;">${e(kpi.value)}</span>
      ${kpi.sub ? `<span style="font-size:10px;color:${subClr};">${e(kpi.sub)}</span>` : ""}
    </div>`;
  }).join("");

  // ── Savings bars ─────────────────────────────────────────────────────────────
  const savingsBars = fs.savingsBreakdown.map(s => {
    const pct = totalSavings > 0 ? Math.round((s.usd / totalSavings) * 100) : 0;
    return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:9px;">
      <span style="font-size:12px;color:#64748b;width:155px;flex-shrink:0;">${e(s.label)}</span>
      <div style="flex:1;height:5px;background:#f1f5f9;border-radius:9999px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:linear-gradient(to right,#2dd4bf,#14b8a6);border-radius:9999px;"></div>
      </div>
      <span style="font-size:12px;font-weight:600;color:#334155;width:58px;text-align:right;font-variant-numeric:tabular-nums;">${fmtUsd(s.usd)}</span>
    </div>`;
  }).join("");

  // ── ESG bullets ──────────────────────────────────────────────────────────────
  const esgBullets = esg.bullets
    .map(b => `<li style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#d8b4fe;flex-shrink:0;display:inline-block;"></span><span style="font-size:12px;color:#334155;line-height:1.6;">${e(b)}</span></li>`)
    .join("");

  const esgBadges = [
    esg.sbtiCommitted
      ? `<div style="display:inline-flex;align-items:center;gap:5px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:4px 10px;margin-right:8px;"><span style="width:5px;height:5px;border-radius:50%;background:#a855f7;display:inline-block;"></span><span style="font-size:10px;font-weight:700;color:#7e22ce;text-transform:uppercase;letter-spacing:0.06em;">SBTi Committed</span></div>`
      : "",
    esg.netZeroPledgeYr
      ? `<div style="display:inline-flex;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:4px 10px;"><span style="font-size:10px;font-weight:600;color:#475569;">Net Zero target: ${esg.netZeroPledgeYr}</span></div>`
      : "",
  ].filter(Boolean).join("");

  const secSnippet = esg.secFilingSnippet
    ? `<div style="border-left:2px solid #d8b4fe;padding:4px 0 4px 16px;margin-top:12px;"><p style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:4px;">SEC 10-K / ESG Filing Excerpt</p><p style="font-size:12px;color:#475569;font-style:italic;line-height:1.6;">"${e(esg.secFilingSnippet)}"</p></div>`
    : "";

  // ── Assumption bullets ───────────────────────────────────────────────────────
  const assumptionItems = cc.keyAssumptions
    .map(a => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;"><span style="margin-top:7px;width:5px;height:5px;border-radius:50%;background:#fcd34d;flex-shrink:0;display:inline-block;"></span><span style="font-size:12px;color:#475569;line-height:1.5;">${e(a)}</span></li>`)
    .join("");

  // ── Next step cards ──────────────────────────────────────────────────────────
  const stepItems = ns.steps
    .map(step => `
    <div style="display:flex;align-items:flex-start;gap:11px;padding:11px 13px;background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;margin-bottom:7px;break-inside:avoid;">
      <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:#fff1f2;border:1px solid #fecdd3;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:9px;font-weight:900;color:#e11d48;">${e(step.order)}</span>
      </div>
      <div>
        <p style="font-size:12px;font-weight:600;color:#1e293b;margin:0 0 3px 0;">${e(step.action)}</p>
        <span style="font-size:10px;color:#94a3b8;">${e(step.owner)}</span>
        <span style="color:#cbd5e1;margin:0 4px;">·</span>
        <span style="font-size:10px;font-weight:600;color:#fb7185;">${e(step.horizon)}</span>
      </div>
    </div>`)
    .join("");

  // ── Full HTML document ───────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Investment Brief – ${e(data.buildingRef)}</title>
<style>
  @page { margin: 1.4cm 1.8cm; size: A4; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; animation: none !important; transition: none !important; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: white; margin: 0; padding: 0; color: #1e293b; }
  h1,h2,h3,p,ul,li { margin: 0; padding: 0; }
  ul { list-style: none; }
  .section { padding: 22px 0; border-bottom: 1px solid #f1f5f9; }
  .section:last-child { border-bottom: none; }
  .sh { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; padding-left: 14px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-bottom: 14px; }
  .capex-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 14px; }
</style>
</head>
<body>

<!-- Document header -->
<div style="padding:22px 28px 18px;border-bottom:1px solid #f1f5f9;">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Rainwater Reuse Systems</span>
        <span style="color:#cbd5e1;">·</span>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Prospect Analysis</span>
      </div>
      <h1 style="font-size:26px;font-weight:900;color:#0f172a;letter-spacing:-0.02em;line-height:1.1;">AI Investment Brief</h1>
      <p style="font-size:12px;color:#64748b;margin-top:5px;">Prepared by ${e(data.analyst)} · ${e(data.generatedAt)}</p>
    </div>
    <div style="text-align:right;flex-shrink:0;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:3px;">Ref</div>
      <div style="font-size:12px;font-family:monospace;font-weight:600;color:#475569;">${e(data.buildingRef)}</div>
      <div style="margin-top:9px;display:inline-flex;align-items:center;gap:5px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;padding:4px 10px;">
        <div style="width:5px;height:5px;border-radius:50%;background:#3b82f6;"></div>
        <span style="font-size:8.5px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.06em;">AI-Generated</span>
      </div>
    </div>
  </div>
</div>

<!-- Building identity -->
<div style="padding:13px 28px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
    <div>
      <h2 style="font-size:18px;font-weight:800;color:#0f172a;">${e(streetAddr)}</h2>
      <div style="display:flex;align-items:center;gap:8px;margin-top:3px;">
        <span style="font-size:12px;color:#475569;">${e(building.metro)}, ${e(building.state)}</span>
        <span style="color:#cbd5e1;">·</span>
        <span style="font-size:12px;color:#64748b;text-transform:capitalize;">${e(building.buildingType.replace(/_/g, " "))}</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:6px 12px;display:flex;align-items:center;gap:5px;">
        <span style="font-size:13px;font-weight:800;color:#92400e;">${e(building.viabilityScore)}</span>
        <span style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#b45309;">Viability</span>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:6px 12px;">
        <span style="font-size:12px;font-weight:500;color:#15803d;">${e(angleLabel)}</span>
      </div>
    </div>
  </div>
</div>

<!-- Report sections -->
<div style="padding:0 28px;">

  <!-- 01 Executive Summary -->
  <div class="section">
    <div class="sh" style="border-left:4px solid #14b8a6;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#0d9488;display:block;margin-bottom:2px;">01</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">Executive Summary</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      <p style="font-size:12px;color:#334155;line-height:1.75;">${e(data.executiveSummary)}</p>
    </div>
  </div>

  <!-- 02 Opportunity Overview -->
  <div class="section">
    <div class="sh" style="border-left:4px solid #3b82f6;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#2563eb;display:block;margin-bottom:2px;">02</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">Opportunity Overview</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      <p style="font-size:12px;font-weight:600;color:#1e293b;margin-bottom:11px;">${e(oo.headline)}</p>
      <ul style="margin-bottom:14px;">
        ${oo.bullets.map(b => `<li style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;"><span style="margin-top:7px;width:6px;height:6px;border-radius:50%;background:#93c5fd;flex-shrink:0;display:inline-block;"></span><span style="font-size:12px;color:#334155;line-height:1.6;">${e(b)}</span></li>`).join("")}
      </ul>
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:11px;padding:9px 13px;">
        <p style="font-size:11px;color:#64748b;line-height:1.6;font-style:italic;">${e(oo.context)}</p>
      </div>
    </div>
  </div>

  <!-- 03 Financial Snapshot -->
  <div class="section">
    <div class="sh" style="border-left:4px solid #10b981;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#059669;display:block;margin-bottom:2px;">03</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">Financial Snapshot</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      <div class="kpi-grid">${kpiCards}</div>

      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:13px 15px;margin-bottom:15px;display:flex;align-items:flex-start;gap:11px;break-inside:avoid;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#0d9488" style="flex-shrink:0;margin-top:2px;"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A8 8 0 0 1 4.07 9h.07a1 1 0 0 1 0 2A6 6 0 0 0 11 16.93zM12 7a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"/></svg>
        <div>
          <p style="font-size:12px;font-weight:700;color:#134e4a;margin-bottom:4px;">Core Differentiator: Confidence-Adjusted ROI</p>
          <p style="font-size:12px;color:#0f766e;line-height:1.65;">The <strong style="color:#042f2e;">${fs.confidenceAdjRoiPct.toFixed(1)}% confidence-adjusted ROI</strong> ties the satellite CV detection score (${fs.cvConfidencePct}% confidence) directly to the financial model. This figure is inherently conservative — it accounts for uncertainty in roof condition and cooling tower activity. A site survey can raise this number, not lower it.</p>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:11px;">Annual Savings Breakdown</p>
        ${savingsBars}
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #f1f5f9;margin-top:5px;">
          <span style="font-size:13px;font-weight:600;color:#1e293b;">Total Annual Savings</span>
          <span style="font-size:18px;font-weight:900;color:#059669;font-variant-numeric:tabular-nums;">${fmtUsd(totalSavings)}</span>
        </div>
      </div>

      <div class="capex-grid">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:11px;padding:10px;text-align:center;">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:5px;font-weight:700;">CapEx Range</div>
          <div style="font-size:12px;font-weight:700;color:#0f172a;">${fmtUsd(fs.capexRangeLow)} – ${fmtUsd(fs.capexRangeHigh)}</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:11px;padding:10px;text-align:center;">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.08em;color:#16a34a;margin-bottom:5px;font-weight:700;">Incentive Value</div>
          <div style="font-size:12px;font-weight:700;color:#15803d;">${fmtUsd(fs.incentiveUsd)}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:11px;padding:10px;text-align:center;">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:5px;font-weight:700;">Net CapEx</div>
          <div style="font-size:12px;font-weight:700;color:#334155;">${fmtUsd(netCapex)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 04 ESG / Resilience -->
  <div class="section">
    <div class="sh" style="border-left:4px solid #a855f7;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9333ea;display:block;margin-bottom:2px;">04</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">ESG / Resilience Context</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      <p style="font-size:12px;font-weight:600;color:#1e293b;margin-bottom:11px;">${e(esg.headline)}</p>
      <ul style="margin-bottom:11px;">${esgBullets}</ul>
      ${esgBadges ? `<div style="margin-bottom:11px;">${esgBadges}</div>` : ""}
      ${secSnippet}
    </div>
  </div>

  <!-- 05 Confidence & Caveats -->
  <div class="section">
    <div class="sh" style="border-left:4px solid #f59e0b;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#d97706;display:block;margin-bottom:2px;">05</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">Confidence &amp; Caveats</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:13px;">
        <div style="flex:1;height:7px;background:#f1f5f9;border-radius:9999px;overflow:hidden;">
          <div style="width:${cc.cvConfidencePct}%;height:100%;background:linear-gradient(to right,#fbbf24,#f59e0b);border-radius:9999px;"></div>
        </div>
        <span style="font-size:13px;font-weight:900;color:#d97706;flex-shrink:0;font-variant-numeric:tabular-nums;">${cc.cvConfidencePct}% CV confidence</span>
      </div>
      <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:7px;">Key Assumptions</p>
      <ul style="margin-bottom:13px;">${assumptionItems}</ul>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:11px;padding:10px 13px;margin-bottom:10px;break-inside:avoid;">
        <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#b45309;margin-bottom:3px;">Next Validation Step</p>
        <p style="font-size:12px;color:#92400e;line-height:1.65;">${e(cc.nextValidationStep)}</p>
      </div>
      <p style="font-size:10px;color:#94a3b8;font-style:italic;line-height:1.6;">${e(cc.disclaimer)}</p>
    </div>
  </div>

  <!-- 06 Recommended Next Steps -->
  <div class="section">
    <div class="sh" style="border-left:4px solid #f43f5e;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#e11d48;display:block;margin-bottom:2px;">06</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">Recommended Next Steps</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      ${stepItems}
      <div style="background:#0f172a;border-radius:14px;padding:15px 17px;margin-top:11px;break-inside:avoid;">
        <p style="font-size:12px;color:#94a3b8;line-height:1.75;font-style:italic;">${e(ns.closingStatement)}</p>
      </div>
    </div>
  </div>

</div>

<!-- Footer -->
<div style="padding:13px 28px;border-top:1px solid #f1f5f9;margin-top:6px;display:flex;align-items:center;justify-content:space-between;">
  <span style="font-size:8px;color:#cbd5e1;font-family:monospace;">Pluvial · AI Investment Brief · ${e(data.buildingRef)}</span>
  <span style="font-size:8px;color:#cbd5e1;">Generated ${e(data.generatedAt)} · Pre-validation draft</span>
</div>

</body>
</html>`;
}
