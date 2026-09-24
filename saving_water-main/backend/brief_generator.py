# brief_generator.py
import os
import json
import logging
import hashlib
from pathlib import Path

from dotenv import load_dotenv
from pydantic import ValidationError

from models import BuildingRecord, BriefResponse, ROIResponse
from models import ProspectSummary, PhysicalSuitability, FinancialSnapshot, ConfidenceCaveats
from rag_retrieval import retrieve_context

load_dotenv()

logger = logging.getLogger(__name__)

MODEL = "gemini-2.5-flash"

# ── Feature flags ────────────────────────���──────────────────────────���──────────
USE_GEMINI = os.environ.get("USE_GEMINI", "true").lower() != "false"

# Session-level circuit breaker: flipped to True on quota/rate errors
_gemini_disabled = False

# ── Brief cache (in-memory, keyed by building_id) ───────────────────────���─────
_brief_cache: dict[str, BriefResponse] = {}

# Optional: persist cache to disk between restarts
_CACHE_FILE = Path(__file__).parent / "data" / "brief_cache.json"


def _load_disk_cache():
    if _CACHE_FILE.exists():
        try:
            raw = json.loads(_CACHE_FILE.read_text())
            for bid, data in raw.items():
                _brief_cache[bid] = BriefResponse.model_validate(data)
            logger.info("Loaded %d cached briefs from disk.", len(_brief_cache))
        except Exception as e:
            logger.warning("Could not load brief cache: %s", e)


def _save_disk_cache(building_id: str, brief: BriefResponse):
    try:
        existing = {}
        if _CACHE_FILE.exists():
            existing = json.loads(_CACHE_FILE.read_text())
        existing[building_id] = brief.model_dump()
        _CACHE_FILE.write_text(json.dumps(existing, indent=2))
    except Exception as e:
        logger.warning("Could not persist brief cache: %s", e)


_load_disk_cache()

# ── Gemini client (lazy) ──────────────────────────────────���────────────────────
_client = None


def _get_client():
    global _client
    if _client is None:
        from google import genai
        key = os.environ.get("GOOGLE_API_KEY")
        if not key:
            raise RuntimeError("GOOGLE_API_KEY not set — add it to backend/.env")
        _client = genai.Client(api_key=key)
    return _client


# ── Prompt builder ───────────────────────────────��────────────────────────────��

def build_prompt(building: BuildingRecord, roi: ROIResponse, context: str) -> str:
    return f"""You are a Grundfos water solutions specialist writing a structured investment brief
for a commercial building rainwater harvesting opportunity in Kenya/East Africa. Fill every field with specific,
numbers-driven content. Do not use generic language.

## Building Record
{building.model_dump_json(indent=2)}

## ROI Analysis ({roi.scenario} scenario)
- Harvestable volume/year:         {roi.harvestable_gal * 0.00378541:,.0f} m³ ({roi.harvestable_gal:,} gal)
- Annual water savings:           KSh {roi.annual_water_savings_usd * 130:,.0f} (${roi.annual_water_savings_usd:,.0f})
- Annual sewer savings:           KSh {roi.annual_sewer_savings_usd * 130:,.0f} (${roi.annual_sewer_savings_usd:,.0f})
- Water bowser & grid reliability savings: KSh {roi.total_annual_savings_usd * 0.3 * 130:,.0f} (${roi.total_annual_savings_usd * 0.3:,.0f})
- Total annual savings:           KSh {roi.total_annual_savings_usd * 130:,.0f} (${roi.total_annual_savings_usd:,.0f})
- System capex (mid):             KSh {roi.capex_mid_usd * 130:,.0f} (${roi.capex_mid_usd:,.0f})
- Simple payback:                 {roi.simple_payback_yrs} years
- 10-year NPV:                    KSh {roi.npv_10yr_usd * 130:,.0f} (${roi.npv_10yr_usd:,.0f})
- Base ROI:                       {roi.base_roi_pct}%
- Confidence-adjusted ROI:        {roi.confidence_adj_roi_pct}% (base × {roi.cv_confidence_pct}% CV confidence)
- CO₂ offset:                     {roi.co2_offset_lbs:,} lbs/year

## Reference Context (grounded sources)
{context}

## Instructions

**why_this_building_now** — Write 2–3 sentences combining urgency drivers, financial signals,
and ESG context using actual numbers from the building record and ROI analysis above. Focus on:
- Business continuity during municipal supply cutoffs
- Avoided water truck/bowser costs (KSh 750–1000/m³ during grid interruptions)
- Nairobi climate seasonality (Long Rains: March–May, Short Rains: Oct–Dec)
- Kenyan regulatory frameworks (NEMA, WASREB, KS 1829 building codes)

**confidence_caveats** — Be honest:
- cv_confidence_pct reflects satellite detection certainty.
- key_assumptions: 2–3 most load-bearing assumptions in the ROI model, including Nairobi rainfall patterns and Kenyan tariff structures.
- next_validation_step: single highest-value action to reduce uncertainty.

Return a complete, sales-ready brief. Every field must be populated with real numbers.
"""


# ── Template fallback ───────────────────────────────────────────────────��──────

def _fmtusd(n: float) -> str:
    if n >= 1_000_000: return f"${n/1_000_000:.1f}M"
    if n >= 1_000:     return f"${n/1_000:.0f}K"
    return f"${n:,.0f}"

def _fmtksh(n: float) -> str:
    if n >= 1_000_000: return f"KSh {n/1_000_000:.1f}M"
    if n >= 1_000:     return f"KSh {n/1_000:.0f}K"
    return f"KSh {n:,.0f}"


def generate_template_brief(building: BuildingRecord, roi: ROIResponse) -> BriefResponse:
    """
    Deterministic brief from building + ROI data.
    Used when Gemini is unavailable or disabled.
    """
    cv_pct    = roi.cv_confidence_pct
    btype     = building.building_type.replace("_", " ").title()
    city      = building.metro.split(",")[0]
    savings   = f"{_fmtksh(roi.total_annual_savings_usd * 130)} ({_fmtusd(roi.total_annual_savings_usd)})"
    payback   = f"{roi.simple_payback_yrs:.1f}"
    npv       = f"{_fmtksh(roi.npv_10yr_usd * 130)} ({_fmtusd(roi.npv_10yr_usd)})"
    capex     = f"{_fmtksh(roi.capex_mid_usd * 130)} ({_fmtusd(roi.capex_mid_usd)})"
    harvest   = f"{int(roi.harvestable_gal * 0.00378541):,} m³ ({int(roi.harvestable_gal):,} gal)"
    co2       = f"{roi.co2_offset_lbs/1000:.1f}K"

    angle_map = {
        "cost_savings":    "Immediate Cost Reduction via Rainwater Harvesting",
        "resilience":      "Water Resilience & Supply Security",
        "compliance":      "Regulatory Compliance & Stormwater Management",
        "esg_credibility": "ESG Commitment & Water Stewardship",
    }
    sales_angle = angle_map.get(building.recommended_angle, "Rainwater Harvesting ROI Opportunity")

    drivers = building.urgency_drivers or [
        f"High municipal water tariff costs in {building.state}",
        f"Large {btype} roof surface ideal for harvesting",
        "Water shedding and grid reliability risks in Nairobi",
    ]

    why_now = (
        f"{btype} in {city} presents a {savings}/year savings opportunity with a "
        f"{payback}-year simple payback at current utility rates. "
        f"The {building.roof_area_sqft/1000:.0f}K sqft roof can harvest {harvest} m³/year "
        f"({cv_pct}% CV confidence), generating a 10-year NPV of {npv}. "
        f"{drivers[0]} creates strong urgency for near-term deployment, particularly given "
        f"Nairobi's municipal supply reliability challenges and avoided water truck costs."
    )

    incentive_note = (
        f"${building.incentive_value_usd:,.0f} incentive available"
        if building.incentive_value_usd > 0
        else "No direct incentive identified — savings-only ROI case"
    )

    return BriefResponse(
        prospect_summary=ProspectSummary(
            address=building.address or f"{btype} · {city}",
            metro_state=f"{building.metro}, {building.state}",
            building_type=btype,
            viability_score=building.viability_score,
        ),
        physical_suitability=PhysicalSuitability(
            roof_area_sqft=int(building.roof_area_sqft * 0.092903),  # Convert to m²
            cooling_tower_detected=building.cooling_tower_present,
            cv_confidence_pct=cv_pct,
            annual_capture_gal=int(roi.harvestable_gal * 0.00378541),  # Convert to m³
        ),
        financial_snapshot=FinancialSnapshot(
            total_annual_savings_usd=int(roi.total_annual_savings_usd),
            simple_payback_yrs=roi.simple_payback_yrs,
            npv_10yr_usd=int(roi.npv_10yr_usd),
            confidence_adj_roi_pct=roi.confidence_adj_roi_pct,
            incentive_flags=incentive_note,
        ),
        why_this_building_now=why_now,
        recommended_sales_angle=sales_angle,
        confidence_caveats=ConfidenceCaveats(
            cv_confidence_pct=cv_pct,
            key_assumptions=(
                f"1. Annual rainfall average of {building.annual_rainfall_in * 25.4:.0f} mm (Nairobi climate: Long Rains March–May, Short Rains Oct–Dec). "
                f"2. 85% collection efficiency on flat commercial roof per KS 1829 building standards. "
                f"3. Utility rates based on NCWSC commercial tariff of KSh 180/m³ (water) and KSh 135/m³ (sewer). "
                f"4. Avoided water truck/bowser costs of KSh 750/m³ during municipal supply interruptions."
            ),
            next_validation_step=(
                "Schedule on-site roof inspection to confirm drainage geometry, "
                f"{'cooling tower capacity and blowdown volume, ' if building.cooling_tower_present else ''}"
                "and verify 12-month utility billing history from NCWSC."
            ),
        ),
    )


# ── Gemini generator ───────────────────────────────────────────────────────────

def _call_gemini(building: BuildingRecord, roi: ROIResponse) -> BriefResponse:
    from google.genai import types

    context = retrieve_context(building)
    prompt  = build_prompt(building, roi, context)

    response = _get_client().models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BriefResponse,
        ),
    )
    return BriefResponse.model_validate_json(response.text)


# ── Public entry point ──────────────────────────────��──────────────────────────

def generate_brief(building: BuildingRecord, roi: ROIResponse) -> BriefResponse:
    global _gemini_disabled

    bid = building.building_id

    # 1. Cache hit
    if bid in _brief_cache:
        logger.info("Brief cache hit for %s", bid)
        return _brief_cache[bid]

    # 2. Gemini path
    if USE_GEMINI and not _gemini_disabled:
        try:
            brief = _call_gemini(building, roi)
            logger.info("Gemini brief generated for %s", bid)
        except Exception as e:
            err = str(e)
            if "429" in err or "quota" in err.lower() or "RESOURCE_EXHAUSTED" in err:
                logger.warning("Gemini quota hit — disabling for this session. Falling back to template.")
                _gemini_disabled = True
            else:
                logger.warning("Gemini failed (%s) — falling back to template.", err)
            brief = generate_template_brief(building, roi)
    else:
        reason = "USE_GEMINI=false" if not USE_GEMINI else "quota circuit breaker active"
        logger.info("Using template brief for %s (%s)", bid, reason)
        brief = generate_template_brief(building, roi)

    # 3. Cache and return
    _brief_cache[bid] = brief
    _save_disk_cache(bid, brief)
    return brief
