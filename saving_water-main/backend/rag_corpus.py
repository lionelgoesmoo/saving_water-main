# rag_corpus.py
# Pre-chunked source excerpts for RAG retrieval.
# Each chunk: id, source, tags, text.
# Tags drive scoring against building signals in rag_retrieval.py.

CORPUS: list[dict] = [
    # ── Texas Water Trade Toolkit 2024 — ROI / Payback ─────────────────────
    {
        "id": "twdb_roi_01",
        "source": "Texas Water Trade Toolkit / TWDB Rainwater Harvesting Manual (3rd ed.)",
        "tags": ["TX", "ROI", "cost_savings", "payback", "commercial", "cooling_tower"],
        "text": (
            "Commercial rainwater harvesting in Texas routinely achieves simple payback periods "
            "of 3–7 years for large-roof industrial and distribution facilities. The Texas Water "
            "Development Board's collection formula uses 0.623 gallons per square foot of roof "
            "area per inch of annual rainfall, with a collection efficiency of 75–85% for "
            "commercial systems (85% for well-designed first-flush diversion setups). "
            "A 420,000 sq ft distribution center roof in San Antonio (30.4 in/yr rainfall) "
            "yields approximately 6.7 million harvestable gallons per year at 85% efficiency — "
            "enough to offset substantial cooling tower makeup water demand. "
            "The State of Texas mandates that every new state-owned building with a roof area "
            "of 10,000 sq ft or larger must incorporate a rainwater harvesting system, condensate "
            "collection, or cooling tower blowdown reuse (Texas Gov't Code §2166.403). "
            "Buildings that achieve Net Zero Water through on-site reuse strategies consume "
            "75–90% less municipal water than conventional equivalents. "
            "Texas Tax Code §151.355 provides a full sales tax exemption on rainwater harvesting "
            "equipment, and §11.32 authorizes local taxing units to grant property tax exemptions "
            "for water-conservation installations — meaningfully reducing effective system capex. "
            "Rainwater is naturally soft and low in dissolved solids, which reduces chemical "
            "treatment costs and scale inhibitor usage compared with municipally supplied cooling "
            "tower makeup water."
        ),
    },

    # ── Texas Water Trade Toolkit 2024 — TCEQ Regulatory Framework ─────────
    {
        "id": "tceq_regulatory_01",
        "source": "TCEQ Regulatory Guidance RG-445 / Texas Rainwater Harvesting FAQ (TWDB)",
        "tags": ["TX", "compliance", "regulatory", "TCEQ", "permit", "non_potable", "cooling_tower"],
        "text": (
            "Under Texas law and TCEQ rules, non-potable rainwater reuse — including cooling "
            "tower makeup, toilet flushing, irrigation, and fire suppression — requires no TCEQ "
            "permit for private commercial systems that do not connect to a public water supply. "
            "TCEQ jurisdiction attaches only when harvested rainwater is distributed as potable "
            "water through a public water system or used in food/beverage manufacturing. "
            "For non-potable indoor uses (cooling towers, process water), the governing standard "
            "is ARCSA/ASPE 78 for stormwater and ARCSA/ASPE 63 for direct rainwater catchment. "
            "Where a harvesting system is connected to a municipal backup supply, Texas requires "
            "a backflow prevention assembly or air gap at the storage facility (capacity > 500 gal) "
            "to prevent cross-contamination (TCEQ RG-445, §3.4). "
            "Installation of systems connected to public water supplies for potable use must be "
            "performed by a licensed master or journeyman plumber holding a Water Supply Protection "
            "Specialist endorsement. "
            "TCEQ classifies rainwater supplied through a public water system as surface water, "
            "subjecting it to full surface water treatment rules — but this classification does "
            "NOT apply to privately closed-loop non-potable systems such as cooling tower makeup. "
            "Texas HB 3391 (2011) explicitly affirmed the right of any person to capture and use "
            "rainwater that falls on property they own or lease, removing prior common-law "
            "uncertainty about water rights for commercial operators."
        ),
    },

    # ── ARCSA/ASPE 78-2021 — Cooling Tower Non-Potable Reuse ───────────────
    {
        "id": "arcsa_cooling_01",
        "source": "ARCSA/ASPE/ANSI 78-2021: Stormwater Harvesting System Design",
        "tags": ["cooling_tower", "compliance", "non_potable", "TX", "CA", "AZ", "PA", "resilience"],
        "text": (
            "ARCSA/ASPE/ANSI 78-2021 is the nationally recognized standard for stormwater "
            "harvesting system design and explicitly approves harvested stormwater for cooling "
            "tower makeup water, toilet/urinal flushing, spray irrigation, decorative fountains, "
            "and fire suppression. "
            "For cooling tower applications, the standard requires: (1) pre-filtration to remove "
            "coarse debris, sediment, and hydrocarbons; (2) advanced filtration (typically "
            "5-micron or finer) to protect valve seats and tower distribution nozzles; and "
            "(3) disinfection — UV or chemical — to eliminate bacteria, pathogens, and Legionella "
            "risk per ASHRAE 188 compliance requirements. "
            "Water quality for cooling tower makeup shall meet the authority-having-jurisdiction's "
            "requirements; in the absence of local standards, the ARCSA/ASPE minimum applies: "
            "turbidity ≤ 2 NTU, no detectable total coliform, and residual disinfectant maintained. "
            "Rainwater is inherently advantageous for cooling tower use because it is low in "
            "hardness and dissolved minerals, reducing scale formation, corrosion inhibitor "
            "dosing, and blowdown frequency versus municipally-softened water. "
            "Commercial cooling towers can consume 5–30+ million gallons of makeup water per "
            "year; replacing even 30–50% of that volume with harvested rainwater constitutes "
            "a material potable-water offset and reduces sewer/discharge fees on blowdown. "
            "The standard is recognized by the ICC (International Code Council) and has been "
            "adopted by reference in green building certification programs including LEED v4.1 "
            "Water Efficiency credits."
        ),
    },

    # ── SBTi / SBTN — GRI 303-3, Scope 3 Water ─────────────────────────────
    {
        "id": "sbti_water_01",
        "source": "Science Based Targets Network (SBTN) Corporate Water Stewardship Guidance / GRI 303: Water and Effluents 2018",
        "tags": ["ESG", "esg_credibility", "SBTi", "GRI", "TX", "CA", "AZ", "PA", "compliance"],
        "text": (
            "The Science Based Targets Network (SBTN) freshwater guidance (2023) requires "
            "companies to set location-specific, basin-level water targets tied to the "
            "ecological carrying capacity of each watershed — not a blanket global percentage "
            "reduction. For facilities in Extremely High Baseline Water Stress basins (WRI "
            "Aqueduct score ≥ 4.0), SBTN guidance calls for net water consumption reductions "
            "of 25–50% relative to baseline, with progress reported annually. "
            "GRI 303-3 (Water and Effluents 2018, effective January 2021) mandates disclosure "
            "of total water withdrawal by source — surface water, groundwater, seawater, and "
            "produced/third-party water — broken down by facility for operations in water-stressed "
            "areas. Companies reporting under GRI 303-3 that install on-site rainwater harvesting "
            "can reclassify captured precipitation as a non-municipal water source, potentially "
            "reducing their GRI 303-3 withdrawal figure and strengthening their SBTN progress "
            "narrative. "
            "SBTi's Corporate Net Zero Standard (2021) treats Scope 3 value chain water risks "
            "as a material factor in science-based target validation for water-intensive sectors. "
            "Companies with active SBTi commitments face investor and proxy-advisor scrutiny of "
            "GRI 303 disclosures; a facility in a water-stressed basin without a documented "
            "on-site reuse strategy is increasingly viewed as a stranded-asset risk. "
            "Amazon, Google, Microsoft, and Apple have each published basin-level water "
            "replenishment targets; facilities operated by or leased to these tenants create "
            "landlord-side pressure to demonstrate water stewardship improvements."
        ),
    },

    # ── EPA Water Risk Atlas — Colorado River Basin, AZ / CA ────────────────
    {
        "id": "epa_water_risk_01",
        "source": "EPA Water Risk Atlas / WRI Aqueduct Water Risk Atlas 3.0",
        "tags": ["AZ", "CA", "drought", "resilience", "water_stress", "esg_credibility", "cost_savings"],
        "text": (
            "The WRI Aqueduct Water Risk Atlas (v3.0, 2023), cited in EPA water planning "
            "guidance, ranks Arizona first and California fifth among U.S. states for overall "
            "water stress severity. Six of the seven Colorado River Basin states appear in the "
            "top 10 most water-stressed jurisdictions nationally — a stress profile comparable "
            "to Saudi Arabia and Qatar. "
            "Since 2000, prolonged drought has reduced Colorado River flows to historically low "
            "levels. Storage in Lakes Powell and Mead — the two largest U.S. reservoirs — has "
            "declined sharply; the risk of reaching critically low 'dead pool' elevations has "
            "increased nearly fourfold over the past decade. Tier 1 and Tier 2 shortage "
            "declarations under the Drought Contingency Plan (2019) have already triggered "
            "mandatory municipal delivery reductions in Arizona and Nevada. "
            "Phoenix and Tucson water utilities project rate increases of 15–25% over the next "
            "decade as infrastructure investment and scarcity-driven supply costs accelerate. "
            "For commercial and industrial facilities in the Phoenix, Tucson, and Inland Empire "
            "metros, on-site rainwater capture is a direct hedge against supply curtailment risk "
            "and rate escalation. A facility with 200,000+ sq ft of roof in Phoenix (8.0 in/yr) "
            "can harvest ~600,000 gal/yr at 85% efficiency — meaningful cooling tower offset in "
            "a region where potable water for HVAC makeup costs $4–6/kgal and rising. "
            "EPA's Water Risk Atlas is used by asset managers, lenders, and insurers to assess "
            "physical water risk at the facility level; high-stress scores increasingly trigger "
            "disclosure requirements under SEC climate rules and TCFD frameworks."
        ),
    },

    # ── Philadelphia Water Department — Stormwater Fee Structure ────────────
    {
        "id": "pwd_stormwater_01",
        "source": "Philadelphia Water Department — Stormwater Billing and Credits Program (rates effective September 2024)",
        "tags": ["PA", "stormwater", "compliance", "cost_savings", "resilience"],
        "text": (
            "Philadelphia operates one of the most sophisticated — and highest — stormwater "
            "utility fee structures in the United States. Non-residential (commercial, industrial, "
            "institutional) properties are billed monthly using two components: "
            "(1) Gross Area (GA) charge: $0.91 per 500 sq ft of total property area; "
            "(2) Impervious Area (IA) charge: $6.42 per 500 sq ft of impervious surface. "
            "Example: a 70,000 sq ft warehouse with 37,000 sq ft of impervious area pays "
            "approximately $591/month ($7,092/year) in stormwater fees alone. A large "
            "distribution center with 500,000 sq ft of nearly fully impervious roof and "
            "pavement could face stormwater bills exceeding $80,000–$90,000/year. "
            "Philadelphia's Stormwater Credits Program allows non-residential properties to "
            "reduce their monthly charge by demonstrating on-site stormwater management. "
            "Available credit types include: Open Space credit (natural pervious surfaces), "
            "Impervious Area Reduction (IAR) credit (downspout routing to pervious areas, "
            "green roofs), and Managed IA/GA credit (green stormwater infrastructure such as "
            "rain gardens, bioswales, cisterns). A rainwater cistern that captures and detains "
            "roof runoff qualifies for Managed IA credit, directly reducing the IA billing units "
            "and producing a dollar-for-dollar reduction in monthly stormwater charges. "
            "The residential flat rate increased to $20.41/month as of September 2024, "
            "reflecting a 10.3% year-over-year increase — underscoring the city's policy "
            "trajectory of shifting stormwater costs to impervious-surface contributors."
        ),
    },

    # ── DOE FEMP Rainwater Harvesting Calculator — Methodology ──────────────
    {
        "id": "doe_femp_01",
        "source": "DOE Federal Energy Management Program (FEMP) — Rainwater Harvesting Tool & Technology Review",
        "tags": ["ROI", "cost_savings", "TX", "CA", "AZ", "PA", "methodology", "payback"],
        "text": (
            "The DOE FEMP Rainwater Harvesting Tool, developed for federal facility managers, "
            "uses a standard collection formula: Harvestable Volume (gal) = Roof Area (sq ft) × "
            "Annual Rainfall (in) × 0.623 × Collection Efficiency Factor. The factor 0.623 "
            "converts inches of rainfall over a square foot to gallons; FEMP applies a "
            "collection efficiency of 75–90% depending on first-flush diversion quality and "
            "guttering completeness. An 85% efficiency rate is the recommended default for "
            "well-designed commercial systems. "
            "FEMP's life-cycle cost (LCC) analysis discounts future savings at the Federal "
            "discount rate (3.1% real, per OMB Circular A-94 guidelines); private-sector "
            "analyses typically use 5–8% real discount rates. At a 5% discount rate, a "
            "commercial rainwater system saving $60,000–$70,000/year generates a positive "
            "10-year NPV for any capex below ~$450,000–$540,000. "
            "FEMP case studies at federal facilities report simple payback periods of 3–9 years "
            "for systems serving cooling tower makeup, toilet flushing, and irrigation demands. "
            "IRR for well-sized commercial systems typically ranges from 12–28% depending on "
            "local water/sewer rates, rainfall, and available incentives. "
            "FEMP emphasizes that the CO₂ emission offset from avoided potable water production "
            "and treatment is approximately 3.2 lbs CO₂e per 1,000 gallons of water offset — "
            "a figure used in federal sustainability reporting under E.O. 14057 and consistent "
            "with EPA's water-energy nexus emissions factors."
    },
    # ── South Africa National Water Act & Cape Town By-laws ────────────────
    {
        "id": "sa_water_01",
        "source": "South Africa National Water Act (Act 36 of 1998) & City of Cape Town Water By-Law",
        "tags": ["South Africa", "ZA", "resilience", "drought", "cooling_tower", "compliance", "cost_savings"],
        "text": (
            "In South Africa, municipal water restrictions and tariff restructuring following the "
            "historic Cape Town 'Day Zero' drought have made commercial rainwater harvesting and on-site "
            "water reuse a strategic imperative. The City of Cape Town Water By-Law mandates that all "
            "commercial and industrial facilities implement water management plans and encourages alternative "
            "non-potable supplies for industrial cooling towers, toilet flushing, and process operations. "
            "Under Schedule 1 of the National Water Act (Act 36 of 1998), reasonable domestic and on-site "
            "catchment from roof runoff does not require a commercial water use licence (WULA), allowing "
            "immediate installation without multi-year bureaucratic permitting delays. "
            "With punitive municipal drought tariffs exceeding R55–R70/kL for high-volume "
            "commercial consumers in Gauteng and Western Cape, large-roof logistics parks (9,000+ m²) "
            "achieve simple payback periods of 2.8 to 4.5 years while insuring against intermittent municipal water shedding."
        ),
    },

    # ── Kenya Water Act & NEMA Rainwater Harvesting Guidelines ─────────────
    {
        "id": "ke_water_01",
        "source": "Kenya Water Act 2016 & National Environment Management Authority (NEMA) Guidelines",
        "tags": ["Kenya", "KE", "cost_savings", "resilience", "compliance", "cooling_tower", "ESG"],
        "text": (
            "In Kenya, Nairobi and Mombasa industrial corridors face chronic municipal rationing, forcing "
            "commercial operators to spend over KSh 750–1000/m³ on private water tankers (bowsers) and "
            "borehole desalination during grid cutoffs. Kenya's National Environment Management Authority (NEMA) and the Nairobi "
            "City County Building By-Laws actively incentivize commercial rainwater catchment systems for "
            "facilities with roof footprints exceeding 5,000 m² (~54,000 sq ft). "
            "With bimodal equatorial rainfall delivering 900 mm annually across Nairobi, "
            "a typical 12,000 m² manufacturing rooftop in Embakasi or Industrial Area "
            "captures 10,800 m³ per year of clean soft water. "
            "This soft rainwater drastically lowers chemical scaling in cooling towers and steam boilers, "
            "reducing maintenance cycles and cutting reliance on erratic municipal connections."
        ),
    },

    # ── Nigeria & West Africa Industrial Water Stewardship ─────────────────
    {
        "id": "ng_water_01",
        "source": "Lagos State Water Regulatory Commission (LASWARCO) & Nigerian Industrial Water Index",
        "tags": ["Nigeria", "NG", "cost_savings", "cooling_tower", "ESG", "resilience"],
        "text": (
            "In Nigeria's commercial and industrial hubs (Lagos, Ogun, Kano), municipal piped water coverage "
            "for industrial zones is less than 20%, requiring industrial facilities to finance costly private "
            "deep aquifers, filtration plants, and backup storage. Energy costs for running groundwater pumps "
            "drive effective commercial water tariffs above ₦2,000–2,500/m³. "
            "Lagos receives intense monsoonal precipitation averaging 1,500–1,900 mm per year. "
            "Gravity-fed rainwater harvesting from large warehouse roofs in Lekki Free Trade Zone, Ikeja, and "
            "Agbara delivers immense volumetric yields at minimal pumping energy, enabling facilities to achieve "
            "water autonomy during the 7-month rainy season and cutting boiler and cooling tower treatment overhead."
        ),
    },

    # ── North Africa (Egypt & Morocco) Industrial Cooling Resilience ───────
    {
        "id": "na_water_01",
        "source": "Morocco National Water Strategy (PNE) & Egypt National Water Resources Plan",
        "tags": ["Morocco", "MA", "Egypt", "EG", "resilience", "drought", "compliance", "cooling_tower"],
        "text": (
            "In North Africa, acute water scarcity along the Mediterranean and Nile basins has prompted national "
            "mandates for closed-loop industrial water reuse. In Morocco (Casablanca, Tangier Automotive City), "
            "severe drought cycles have led to industrial quota limits and rising water tariffs, making rainwater "
            "storage and air conditioning condensate recovery essential for maintaining export manufacturing operations. "
            "Under Morocco's Law 36-15 on Water, facilities integrating on-site stormwater retention and reuse "
            "qualify for preferential environmental subsidies. In Egypt, industrial zones in 6th of October and "
            "10th of Ramadan prioritize cooling tower blowdown recycling and rooftop collection to safeguard production lines."
        ),
    },
]
