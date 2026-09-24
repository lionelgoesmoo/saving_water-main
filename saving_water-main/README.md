# Pluvial - Overall Winner 🏆
### Automated Water-Reuse Prospecting Engine - HackSMU 2026

Built for **Grundfos**. Identifies commercial and industrial buildings across the continental US that are strong candidates for rainwater harvesting systems, ranked by opportunity score and visualized on an interactive national map.

---

## The Problem

Finding the right buildings for water-reuse systems is a manual, expensive prospecting problem. Sales teams rely on gut instinct and cold outreach across millions of potential sites. RainUSE Nexus automates that search — scoring every large commercial rooftop in 37 states against physical, financial, regulatory, and ESG criteria, then surfacing the best opportunities in a sales-ready interface.

---

## What It Does

1. **Discovers large buildings** — roof catchment area 100,000–1,000,000 sqft from Microsoft's 129M-building open dataset
2. **Filters false positives** — 5-stage geometry filter removes farms, parking canopies, lakes, and irregular shapes
3. **Flags cooling towers** — cross-referenced against EPA FRS facility registry by NAICS industry code
4. **Attaches rainfall data** — NOAA 30-year county precipitation normals per building
5. **Enriches addresses** — street address and building type via Overture Maps
6. **Scores every building** — multi-dimensional viability and urgency scoring
7. **Surfaces opportunities** — interactive national choropleth + building-level drill-down with AI sales briefs
8. **Calculates financial ROI** — three-scenario engine (conservative / base / upside) with CV-confidence-adjusted returns
9. **Delivers pitch-ready briefs** — Gemini RAG brief rendered as a structured 7-section investment deliverable, emailable as a PDF

**Output:** 11,577 pre-scored candidate buildings across 37 states, ready for sales prospecting.

---

## Architecture

### Pipeline (Python / GeoPandas)

```
Microsoft Building Footprints (GeoJSON per state)
         ↓
s01  Download + geometry filter    → large_buildings_{STATE}.gpkg
s01b Re-filter in place (QA pass)  → large_buildings_{STATE}.gpkg (overwrite)
s02  EPA FRS facility download     → industrial_facilities_{STATE}.csv
s03  Spatial join                  → buildings_enriched_{STATE}.gpkg  (cooling tower flag)
s04  Rainfall join                 → buildings_rainfall_{STATE}.gpkg  (annual_rainfall_in)
s05  Overture address enrichment   → buildings_addressed_{STATE}.gpkg (address, city)
s06  Scoring                       → output/buildings.json
                                   → output/state_scores.json
s07  CV layer (optional)           → CLIP confidence scores per building
```

### Backend (FastAPI / Python)

Loads `buildings.json` once at startup into memory. All endpoints are sub-millisecond reads except `/brief` and `/email-brief`.

| Endpoint | Description |
|----------|-------------|
| `GET /buildings` | Full building list with satellite imagery URLs injected per building |
| `GET /buildings/{id}` | Single building lookup by ID |
| `POST /roi` | Three-scenario ROI engine (conservative / base / upside) — harvestable gallons, CAPEX, NPV, payback, CV-confidence-adjusted ROI |
| `POST /brief` | Gemini RAG brief — structured 7-section investment deliverable, template fallback + disk cache |
| `POST /email-brief` | Renders brief as PDF via WeasyPrint, delivers to recipient via Resend |

### Frontend (Next.js / MapLibre GL)

- **National view** — state choropleth colored by opportunity tier (Prime → Low)
- **State view** — zooms to state, renders individual building markers
- **Building view** — satellite imagery, roof polygon overlay, cooling tower markers
- **Right panel** — building profile, ROI preview, AI brief generation

---

## Scoring

### Building Viability Score (0–100)

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Physical | 25% | Roof area tier + cooling tower presence |
| Financial | 25% | Annual water + sewer savings vs local utility rates |
| Regulatory | 20% | State incentive environment, stormwater fees |
| ESG | 20% | Drought risk, SBTi commitment, LEED certification |
| Climate Risk | 10% | Long-term water scarcity exposure |

### Urgency Score (1–10)

Composite of drought risk index, water rate pressure, stormwater fee activity, and ESG commitments. Drives the "why now" angle in AI briefs.

### State Opportunity Score (0–100, choropleth)

![pluvial_map](readme_assets/pulvial1.png)

Weighted from pipeline sub-scores that actually vary by state:

| Sub-score | Weight |
|-----------|--------|
| Water cost pressure | 38% |
| Rainfall capture potential | 31% |
| Regulatory / incentive tailwind | 31% |
| Candidate count density bonus | +10 pts max |

Tiers: **Prime** (75+) · **Strong** (60–75) · **Moderate** (48–60) · **Emerging** (38–48) · **Low** (<38)

![pluvial_zoom16](readme_assets/pulvial2.png)

---

## Data Sources

| Data | Source | Used for |
|------|--------|----------|
| Building footprints | Microsoft USBuildingFootprints (129M buildings) | Roof geometry, lat/lng |
| Geometry classification | OpenStreetMap (embedded in MS footprints) | Building type tags |
| Cooling tower proxy | EPA Facility Registry Service (FRS) | NAICS-based facility matching |
| Rainfall normals | NOAA Climate Normals 1991–2020 | Annual precipitation per building |
| Address enrichment | Overture Maps | Street address, building use |
| Water & sewer rates | State-level utility averages | ROI calculation |
| Satellite imagery | Google Maps Static API (zoom 18) | Visual rooftop confirmation |
| State boundaries | US Census Bureau GeoJSON (5m) | Choropleth map layer |

---

## ROI Model
![pluvial_roi](readme_assets/pulvial3.png)

```
harvestable_gal = roof_area_sqft × rainfall_in × 0.623 × efficiency

annual_savings  = (harvestable / 1000) × (water_rate + sewer_rate × 0.70)
                + stormwater_fee_avoidance
                + incentive_value / 10

npv_10yr        = Σ annual_savings / (1.05)^year  −  capex
payback_yrs     = capex / annual_savings
```

Three scenarios (conservative / base / upside) adjust rainfall, efficiency, and capex multipliers.

---

## AI Brief Generation
![pluvial_AI_brief](readme_assets/pulvial4.png)

Each building can generate a structured sales brief via Google Gemini:

- Prospect summary and physical suitability
- Financial snapshot (savings, payback, NPV)
- Recommended sales angle (`cost_savings` / `resilience` / `compliance` / `esg_credibility`)
- Confidence caveats and next validation steps

Includes a **template fallback** (no API call) so demos never fail on quota limits, plus in-memory + disk caching for instant re-loads.

---

## Current Coverage

```
37 states  ·  11,577 scored buildings
AL AR AZ CA CO GA IA ID IN KY LA ME MI MN MO
MS MT NC ND NE NM NV NY OH OK OR PA SC SD TN
TX UT VA WA WI WV WY
```

---

## Running Locally

### Prerequisites
- Python 3.11+, Node 18+
- Google Maps API key (satellite imagery)
- Google Gemini API key (AI briefs, optional)

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Create backend/.env
echo "GOOGLE_MAPS_API_KEY=your_key" > .env
echo "GOOGLE_API_KEY=your_gemini_key" >> .env

uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

### Pipeline (re-run scoring only)
```bash
cd pipeline
source venv/bin/activate
python -m scripts.s06_score          # regenerate buildings.json from existing processed files
cp output/buildings.json ../backend/data/
cp output/buildings.json ../frontend/public/data/
cp output/state_scores.json ../backend/data/
cp output/state_scores.json ../frontend/public/data/
```

---

## Project Structure

```
saving_water/
├── pipeline/
│   ├── config.py                     ← paths, constants, state lists
│   ├── scripts/
│   │   ├── s01_download_footprints.py  ← download + 5-stage geometry filter
│   │   ├── s01b_refilter_existing.py   ← re-apply filter without re-downloading
│   │   ├── s02_download_epa_frs.py
│   │   ├── s03_spatial_join.py
│   │   ├── s04_rainfall_join.py
│   │   ├── s05_overture_enrich.py
│   │   ├── s06_score.py                ← scoring → buildings.json + state_scores.json
│   │   └── s07_cv_layer.py             ← OpenAI CLIP visual confidence
│   ├── data/
│   │   ├── raw/                        ← input GeoJSON per state
│   │   └── processed/                  ← intermediate .gpkg files
│   └── output/
│       ├── buildings.json
│       └── state_scores.json
│
├── backend/
│   ├── main.py                         ← FastAPI app, satellite URL injection
│   ├── models.py                       ← Pydantic schemas
│   ├── roi_engine.py                   ← ROI / NPV calculation
│   ├── brief_generator.py              ← Gemini brief + template fallback
│   └── data/
│       ├── buildings.json              ← copy from pipeline output
│       └── state_scores.json
│
└── frontend/
    ├── src/
    │   ├── app/                        ← Next.js pages (map, roi, brief)
    │   ├── components/
    │   │   ├── map/MainMap.tsx         ← MapLibre choropleth + building markers
    │   │   ├── dashboard/              ← prospecting dashboard layout
    │   │   ├── panels/                 ← building profile, ROI, brief panels
    │   │   └── brief/SatellitePanel.tsx
    │   └── lib/
    │       ├── stateOpportunity.ts     ← opportunity scoring + color scale
    │       └── api.ts                  ← data loading helpers
    └── public/data/                    ← static JSON served to browser
```

---

## Key Design Decisions

**Roof area** — Microsoft's dataset provides ML-derived building polygons for all 50 states. Roof area comes directly from polygon geometry — zero inference cost, near-perfect coverage.

**EPA FRS over satellite for cooling tower detection** — NAICS codes reliably flag cooling tower presence for power plants, refineries, hospitals, data centers, and hotels via a spatial join. Faster, cheaper, and no false positives from puddles or HVAC units.

**Geometry filter before any enrichment** — A 5-stage shape filter (area bounds, compactness, bbox fill ratio, aspect ratio, building class) eliminates farms, lakes, parking canopies, and highway overpasses early, keeping only credible commercial rooftops in the pipeline.

**Template brief fallback** — Gemini quota limits are real during demos. The fallback generates a deterministic, data-accurate brief from real pipeline numbers — no API call, no failure.
