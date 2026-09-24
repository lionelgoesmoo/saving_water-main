"""
brief_html.py
Generates a self-contained HTML document for the investment brief.
Used by the email endpoint to produce the PDF attachment.
"""

from __future__ import annotations
from models import BuildingRecord, ROIResponse, BriefResponse


def _usd(n: float) -> str:
    if n >= 1_000_000:
        return f"${n / 1_000_000:.2f}M"
    if n >= 1_000:
        return f"${round(n / 1_000)}K"
    return f"${n:,.0f}"


def _gal(n: float) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.2f}M gal/yr"
    if n >= 1_000:
        return f"{round(n / 1_000)}K gal/yr"
    return f"{n:,} gal/yr"


def _esc(s: object) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


ANGLE_LABELS = {
    "cost_savings":    "Cost Savings",
    "resilience":      "Resilience",
    "compliance":      "Compliance",
    "esg_credibility": "ESG Credibility",
}


def _kpi_card(label: str, value: str, sub: str | None, highlight: bool) -> str:
    bg      = "#f0fdfa" if highlight else "#ffffff"
    border  = "#99f6e4" if highlight else "#e2e8f0"
    val_clr = "#0f766e" if highlight else "#0f172a"
    sub_clr = "#0d9488" if highlight else "#64748b"
    sub_html = f'<span style="font-size:10px;color:{sub_clr};">{_esc(sub)}</span>' if sub else ""
    return (
        f'<div style="background:{bg};border:1px solid {border};border-radius:12px;'
        f'padding:13px 15px;display:flex;flex-direction:column;gap:5px;break-inside:avoid;">'
        f'<span style="font-size:8.5px;font-weight:700;text-transform:uppercase;'
        f'letter-spacing:0.08em;color:#64748b;">{_esc(label)}</span>'
        f'<span style="font-size:19px;font-weight:900;color:{val_clr};line-height:1;'
        f'font-variant-numeric:tabular-nums;">{_esc(value)}</span>'
        f'{sub_html}</div>'
    )


def _savings_bar(label: str, usd: float, total: float) -> str:
    pct = round(usd / total * 100) if total > 0 else 0
    return (
        f'<div style="display:flex;align-items:center;gap:12px;margin-bottom:9px;">'
        f'<span style="font-size:12px;color:#64748b;width:155px;flex-shrink:0;">{_esc(label)}</span>'
        f'<div style="flex:1;height:5px;background:#f1f5f9;border-radius:9999px;overflow:hidden;">'
        f'<div style="width:{pct}%;height:100%;background:linear-gradient(to right,#2dd4bf,#14b8a6);'
        f'border-radius:9999px;"></div></div>'
        f'<span style="font-size:12px;font-weight:600;color:#334155;width:58px;text-align:right;'
        f'font-variant-numeric:tabular-nums;">{_usd(usd)}</span></div>'
    )


def _bullet(text: str, color: str) -> str:
    return (
        f'<li style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">'
        f'<span style="margin-top:7px;width:6px;height:6px;border-radius:50%;'
        f'background:{color};flex-shrink:0;display:inline-block;"></span>'
        f'<span style="font-size:12px;color:#334155;line-height:1.6;">{_esc(text)}</span></li>'
    )


def _step_card(order: str, action: str, owner: str, horizon: str) -> str:
    return (
        f'<div style="display:flex;align-items:flex-start;gap:11px;padding:11px 13px;'
        f'background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;margin-bottom:7px;break-inside:avoid;">'
        f'<div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:#fff1f2;'
        f'border:1px solid #fecdd3;display:flex;align-items:center;justify-content:center;">'
        f'<span style="font-size:9px;font-weight:900;color:#e11d48;">{_esc(order)}</span></div>'
        f'<div><p style="font-size:12px;font-weight:600;color:#1e293b;margin:0 0 3px 0;">{_esc(action)}</p>'
        f'<span style="font-size:10px;color:#94a3b8;">{_esc(owner)}</span>'
        f'<span style="color:#cbd5e1;margin:0 4px;">·</span>'
        f'<span style="font-size:10px;font-weight:600;color:#fb7185;">{_esc(horizon)}</span>'
        f'</div></div>'
    )


def generate_brief_html(
    building: BuildingRecord,
    roi: ROIResponse,
    brief: BriefResponse,
    generated_at: str,
) -> str:
    """Return a complete standalone HTML document for the investment brief."""

    # ── Derived values ────────────────────────────────────────────────────────
    cv_pct      = brief.physical_suitability.cv_confidence_pct
    capex_low   = building.system_capex_range[0] if building.system_capex_range else round(roi.capex_mid_usd * 0.82)
    capex_high  = building.system_capex_range[1] if building.system_capex_range else round(roi.capex_mid_usd * 1.18)
    net_capex   = ((capex_low + capex_high) / 2) - building.incentive_value_usd
    angle_label = ANGLE_LABELS.get(building.recommended_angle, building.recommended_angle)
    street_addr = building.address.split(",")[0]

    incentive_amort = max(
        0,
        roi.total_annual_savings_usd
        - roi.annual_water_savings_usd
        - roi.annual_sewer_savings_usd
        - roi.stormwater_fee_avoidance_usd,
    )

    savings_breakdown = [
        ("Water savings",        roi.annual_water_savings_usd),
        ("Sewer savings",        roi.annual_sewer_savings_usd),
        ("Stormwater avoidance", roi.stormwater_fee_avoidance_usd),
    ]
    if incentive_amort > 0:
        savings_breakdown.append(("Incentive amortization", incentive_amort))
    total_savings = sum(v for _, v in savings_breakdown)

    # ── KPI cards ─────────────────────────────────────────────────────────────
    kpis = [
        ("Harvestable Gallons", _gal(brief.physical_suitability.annual_capture_gal),
         "Annual capture, base efficiency", False),
        ("Annual Savings",      _usd(roi.total_annual_savings_usd),
         "Water + sewer + stormwater", False),
        ("Simple Payback",      f"{roi.simple_payback_yrs:.1f} yrs",
         "After available incentives", False),
        ("10-yr NPV",           _usd(roi.npv_10yr_usd),
         "5% discount rate", False),
        ("Base ROI",            f"{roi.base_roi_pct:.1f}%",
         "10-year horizon", False),
        ("Confidence-Adj ROI",  f"{roi.confidence_adj_roi_pct:.1f}%",
         f"Adjusted by {cv_pct}% CV confidence", True),
        ("CO₂ Offset",          f"{roi.co2_offset_lbs / 1000:.1f}K lbs/yr",
         "3.2 lbs per kgal avoided", False),
        ("CapEx Midpoint",      _usd(roi.capex_mid_usd),
         f"Range: {_usd(capex_low)} – {_usd(capex_high)}", False),
    ]
    kpi_html = "".join(_kpi_card(l, v, s, h) for l, v, s, h in kpis)

    # ── Savings bars ──────────────────────────────────────────────────────────
    bars_html = "".join(_savings_bar(l, v, total_savings) for l, v in savings_breakdown)

    # ── Opportunity bullets ───────────────────────────────────────────────────
    opp_bullets = [
        f"{round(brief.physical_suitability.roof_area_sqft / 1_000)}K sqft roof yields approximately "
        f"{_gal(brief.physical_suitability.annual_capture_gal)} under base-case rainfall assumptions.",
        f"Annual combined savings of {_usd(roi.total_annual_savings_usd)} deliver a "
        f"{roi.simple_payback_yrs:.1f}-year payback — after applying a "
        f"{_usd(building.incentive_value_usd)} available incentive.",
        (
            f"Cooling tower activity detected at {cv_pct}% CV confidence via satellite — "
            "the highest-leverage water consumption signal for blowdown substitution."
            if brief.physical_suitability.cooling_tower_detected
            else f"Roof surface confirmed at {cv_pct}% CV confidence via satellite imagery."
        ),
        (
            f"Stormwater fee avoidance of {_usd(roi.stormwater_fee_avoidance_usd)}/yr captured independently."
            if roi.stormwater_fee_avoidance_usd > 0
            else f"Water + sewer combined savings of "
                 f"{_usd(roi.annual_water_savings_usd + roi.annual_sewer_savings_usd)}/yr "
                 "form the core financial driver."
        ),
    ]
    opp_html = "".join(_bullet(b, "#93c5fd") for b in opp_bullets)

    # ── ESG bullets ───────────────────────────────────────────────────────────
    esg_bullets_data = [
        f"CV confidence score of {cv_pct}% reflects satellite-derived detection certainty for "
        f"physical signals including roof geometry"
        f"{' and cooling tower activity' if brief.physical_suitability.cooling_tower_detected else ''}.",
        f"CO₂ offset of {roi.co2_offset_lbs / 1000:.1f}K lbs/yr represents direct scope 3 emissions "
        "reduction via potable water demand avoidance.",
        f"10-year NPV of {_usd(roi.npv_10yr_usd)} at a 5% discount rate demonstrates durable financial "
        "value well beyond the initial payback horizon.",
    ]
    esg_html = "".join(_bullet(b, "#d8b4fe") for b in esg_bullets_data)

    # ── Assumptions ───────────────────────────────────────────────────────────
    raw_assumptions = brief.confidence_caveats.key_assumptions
    # Parse numbered/bulleted lines; fall back to sentence split
    lines = [
        line.lstrip("0123456789.-* ").strip()
        for line in raw_assumptions.split("\n")
        if len(line.strip()) > 15
    ]
    if len(lines) < 2:
        lines = [
            s.strip() + ("." if not s.strip().endswith(".") else "")
            for s in raw_assumptions.split(". ")
            if len(s.strip()) > 15
        ]
    assumptions = lines[:6]
    assumptions_html = "".join(
        f'<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;">'
        f'<span style="margin-top:7px;width:5px;height:5px;border-radius:50%;background:#fcd34d;'
        f'flex-shrink:0;display:inline-block;"></span>'
        f'<span style="font-size:12px;color:#475569;line-height:1.5;">{_esc(a)}</span></li>'
        for a in assumptions
    )

    # ── Next steps ────────────────────────────────────────────────────────────
    steps = [
        ("1", "Schedule a physical site survey to confirm roof condition, drainage geometry, and "
               "cooling tower operational status", "Account Executive", "Week 1–2"),
        ("2", "Pull 12-month utility billing history to validate water and sewer rate assumptions",
               "AE + Customer", "Week 1"),
    ]
    if building.incentive_value_usd > 0:
        steps.append(("3", "File incentive pre-application to reserve funding allocation — "
                           "programs are first-come, first-served", "Inside Sales", "Week 2–3"))
    steps += [
        (str(len(steps) + 1),
         "Issue binding CapEx quote and updated brief based on site survey findings",
         "Engineering", "Week 3–4"),
        (str(len(steps) + 2),
         "Present final brief to decision-maker with confirmed numbers and binding proposal",
         "AE + SE", "Week 4–6"),
    ]
    steps_html = "".join(_step_card(*s) for s in steps)

    closing = (
        f"This {building.building_type.replace('_', ' ')} in {building.metro} represents a "
        f"{'high-urgency' if roi.simple_payback_yrs <= 3 else 'strong'} opportunity: "
        f"{_usd(roi.total_annual_savings_usd)}/yr in combined savings at a "
        f"{roi.simple_payback_yrs:.1f}-year payback. Moving to site survey is the single "
        "highest-value next action to convert this analysis into a binding proposal."
    )

    disclaimer = (
        "This brief was generated by the Pluvial AI engine using satellite-derived building data "
        "and public utility rate schedules. All financial projections are estimates based on "
        "parameterized models and should not be relied upon as engineering or financial advice. "
        "A qualified engineer should review all assumptions prior to commercial proposal."
    )

    building_ref = building.building_id.upper()

    # ── Full HTML ─────────────────────────────────────────────────────────────
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Investment Brief – {_esc(building_ref)}</title>
<style>
  @page {{ margin: 1.4cm 1.8cm; size: A4; }}
  * {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
       box-sizing: border-box; animation: none !important; transition: none !important; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          background: white; margin: 0; padding: 0; color: #1e293b; }}
  h1,h2,h3,p,ul,li {{ margin: 0; padding: 0; }}
  ul {{ list-style: none; }}
  .section {{ padding: 22px 0; border-bottom: 1px solid #f1f5f9; }}
  .section:last-child {{ border-bottom: none; }}
  .sh {{ display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; padding-left: 14px; }}
  .kpi-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-bottom: 14px; }}
  .capex-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-top: 14px; }}
</style>
</head>
<body>

<div style="padding:22px 28px 18px;border-bottom:1px solid #f1f5f9;">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Rainwater Reuse Systems</span>
        <span style="color:#cbd5e1;">·</span>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;">Prospect Analysis</span>
      </div>
      <h1 style="font-size:26px;font-weight:900;color:#0f172a;letter-spacing:-0.02em;line-height:1.1;">AI Investment Brief</h1>
      <p style="font-size:12px;color:#64748b;margin-top:5px;">Prepared by Pluvial AI Engine · {_esc(generated_at)}</p>
    </div>
    <div style="text-align:right;flex-shrink:0;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:3px;">Ref</div>
      <div style="font-size:12px;font-family:monospace;font-weight:600;color:#475569;">{_esc(building_ref)}</div>
      <div style="margin-top:9px;display:inline-flex;align-items:center;gap:5px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;padding:4px 10px;">
        <div style="width:5px;height:5px;border-radius:50%;background:#3b82f6;"></div>
        <span style="font-size:8.5px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.06em;">AI-Generated</span>
      </div>
    </div>
  </div>
</div>

<div style="padding:13px 28px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
    <div>
      <h2 style="font-size:18px;font-weight:800;color:#0f172a;">{_esc(street_addr)}</h2>
      <div style="display:flex;align-items:center;gap:8px;margin-top:3px;">
        <span style="font-size:12px;color:#475569;">{_esc(building.metro)}, {_esc(building.state)}</span>
        <span style="color:#cbd5e1;">·</span>
        <span style="font-size:12px;color:#64748b;text-transform:capitalize;">{_esc(building.building_type.replace("_", " "))}</span>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:6px 12px;display:flex;align-items:center;gap:5px;">
        <span style="font-size:13px;font-weight:800;color:#92400e;">{building.viability_score}</span>
        <span style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#b45309;">Viability</span>
      </div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:6px 12px;">
        <span style="font-size:12px;font-weight:500;color:#15803d;">{_esc(angle_label)}</span>
      </div>
    </div>
  </div>
</div>

<div style="padding:0 28px;">

  <div class="section">
    <div class="sh" style="border-left:4px solid #14b8a6;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#0d9488;display:block;margin-bottom:2px;">01</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">Executive Summary</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      <p style="font-size:12px;color:#334155;line-height:1.75;">{_esc(brief.why_this_building_now)}</p>
    </div>
  </div>

  <div class="section">
    <div class="sh" style="border-left:4px solid #3b82f6;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#2563eb;display:block;margin-bottom:2px;">02</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">Opportunity Overview</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      <p style="font-size:12px;font-weight:600;color:#1e293b;margin-bottom:11px;">{_esc(brief.recommended_sales_angle)}</p>
      <ul style="margin-bottom:14px;">{opp_html}</ul>
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:11px;padding:9px 13px;">
        <p style="font-size:11px;color:#64748b;line-height:1.6;font-style:italic;">
          {_esc(building.metro)}, {_esc(building.state)} · {_esc(building.building_type.replace("_", " "))} ·
          {building.annual_rainfall_in}" annual rainfall (NOAA 30-yr avg).
          Base-case scenario uses standard collection efficiency and current utility rate schedules.
        </p>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="sh" style="border-left:4px solid #10b981;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#059669;display:block;margin-bottom:2px;">03</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">Financial Snapshot</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      <div class="kpi-grid">{kpi_html}</div>
      <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:13px 15px;margin-bottom:15px;display:flex;align-items:flex-start;gap:11px;break-inside:avoid;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#0d9488" style="flex-shrink:0;margin-top:2px;"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A8 8 0 0 1 4.07 9h.07a1 1 0 0 1 0 2A6 6 0 0 0 11 16.93zM12 7a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"/></svg>
        <div>
          <p style="font-size:12px;font-weight:700;color:#134e4a;margin-bottom:4px;">Core Differentiator: Confidence-Adjusted ROI</p>
          <p style="font-size:12px;color:#0f766e;line-height:1.65;">The <strong style="color:#042f2e;">{roi.confidence_adj_roi_pct:.1f}% confidence-adjusted ROI</strong> ties the satellite CV detection score ({cv_pct}% confidence) directly to the financial model. This figure is inherently conservative — it accounts for uncertainty in roof condition and cooling tower activity. A site survey can raise this number, not lower it.</p>
        </div>
      </div>
      <div style="margin-bottom:16px;">
        <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-bottom:11px;">Annual Savings Breakdown</p>
        {bars_html}
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid #f1f5f9;margin-top:5px;">
          <span style="font-size:13px;font-weight:600;color:#1e293b;">Total Annual Savings</span>
          <span style="font-size:18px;font-weight:900;color:#059669;font-variant-numeric:tabular-nums;">{_usd(total_savings)}</span>
        </div>
      </div>
      <div class="capex-grid">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:11px;padding:10px;text-align:center;">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:5px;font-weight:700;">CapEx Range</div>
          <div style="font-size:12px;font-weight:700;color:#0f172a;">{_usd(capex_low)} – {_usd(capex_high)}</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:11px;padding:10px;text-align:center;">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.08em;color:#16a34a;margin-bottom:5px;font-weight:700;">Incentive Value</div>
          <div style="font-size:12px;font-weight:700;color:#15803d;">{_usd(building.incentive_value_usd)}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:11px;padding:10px;text-align:center;">
          <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:5px;font-weight:700;">Net CapEx</div>
          <div style="font-size:12px;font-weight:700;color:#334155;">{_usd(net_capex)}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="sh" style="border-left:4px solid #a855f7;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9333ea;display:block;margin-bottom:2px;">04</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">ESG / Resilience Context</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      <p style="font-size:12px;font-weight:600;color:#1e293b;margin-bottom:11px;">{_esc(brief.recommended_sales_angle)}</p>
      <ul style="margin-bottom:11px;">{esg_html}</ul>
    </div>
  </div>

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
          <div style="width:{cv_pct}%;height:100%;background:linear-gradient(to right,#fbbf24,#f59e0b);border-radius:9999px;"></div>
        </div>
        <span style="font-size:13px;font-weight:900;color:#d97706;flex-shrink:0;font-variant-numeric:tabular-nums;">{cv_pct}% CV confidence</span>
      </div>
      <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:7px;">Key Assumptions</p>
      <ul style="margin-bottom:13px;">{assumptions_html}</ul>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:11px;padding:10px 13px;margin-bottom:10px;break-inside:avoid;">
        <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#b45309;margin-bottom:3px;">Next Validation Step</p>
        <p style="font-size:12px;color:#92400e;line-height:1.65;">{_esc(brief.confidence_caveats.next_validation_step)}</p>
      </div>
      <p style="font-size:10px;color:#94a3b8;font-style:italic;line-height:1.6;">{_esc(disclaimer)}</p>
    </div>
  </div>

  <div class="section">
    <div class="sh" style="border-left:4px solid #f43f5e;">
      <div>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#e11d48;display:block;margin-bottom:2px;">06</span>
        <h2 style="font-size:16px;font-weight:700;color:#0f172a;">Recommended Next Steps</h2>
      </div>
    </div>
    <div style="padding-left:14px;">
      {steps_html}
      <div style="background:#0f172a;border-radius:14px;padding:15px 17px;margin-top:11px;break-inside:avoid;">
        <p style="font-size:12px;color:#94a3b8;line-height:1.75;font-style:italic;">{_esc(closing)}</p>
      </div>
    </div>
  </div>

</div>

<div style="padding:13px 28px;border-top:1px solid #f1f5f9;margin-top:6px;display:flex;align-items:center;justify-content:space-between;">
  <span style="font-size:8px;color:#cbd5e1;font-family:monospace;">Pluvial · AI Investment Brief · {_esc(building_ref)}</span>
  <span style="font-size:8px;color:#cbd5e1;">Generated {_esc(generated_at)} · Pre-validation draft</span>
</div>

</body>
</html>"""
