# -*- coding: utf-8 -*-
"""
Run the full RainUse Nexus data pipeline end-to-end.

Usage:
    python run_pipeline.py                  # all 4 states
    python run_pipeline.py TX CA            # specific states
    python run_pipeline.py TX --cv          # include CV layer (Step 7)

Steps:
    1. Overture Maps (DuckDB) → large commercial/industrial buildings >100k sqft
    2. EPA FRS → filter cooling-tower NAICS codes
    3. Spatial join → buildings get EPA address + cooling tower flag
    4. NOAA rainfall → attach annual precipitation per building
    5. (pass-through) copy rainfall file as addressed file
    6. Score → viability scores, write buildings.json + state_scores.json
    7. CV layer (optional) → CLIP cooling tower visual confirmation
"""

import sys
import argparse
import logging
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from config import TARGET_STATES

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("pipeline")


def parse_args():
    p = argparse.ArgumentParser(description="RainUse Nexus data pipeline")
    p.add_argument(
        "states", nargs="*",
        help="State abbreviations to process (default: TX CA NY AZ)"
    )
    p.add_argument("--cv", action="store_true", help="Run Step 7: CLIP CV layer")
    return p.parse_args()


def main():
    args = parse_args()

    if args.states:
        abbrs = set(a.upper() for a in args.states)
        states = {k: v for k, v in TARGET_STATES.items() if v in abbrs}
        if not states:
            log.error(f"No matching states found for: {args.states}")
            sys.exit(1)
    else:
        states = TARGET_STATES

    log.info(f"Running pipeline for states: {list(states.values())}")

    # ── Step 1 ─────────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("STEP 1: Overture Maps — large commercial/industrial buildings")
    log.info("=" * 60)
    from scripts.s01_download_footprints import run as run_01
    run_01(states)

    # ── Step 2 ─────────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("STEP 2: EPA FRS — cooling tower industrial facilities")
    log.info("=" * 60)
    from scripts.s02_download_epa_frs import run as run_02
    run_02(states)

    # ── Step 3 ─────────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("STEP 3: Spatial join — buildings + EPA facilities")
    log.info("=" * 60)
    from scripts.s03_spatial_join import run as run_03
    run_03(states)

    # ── Step 4 ─────────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("STEP 4: NOAA rainfall normals per building")
    log.info("=" * 60)
    from scripts.s04_rainfall_join import run as run_04
    run_04(states)

    # ── Step 5 — pass-through (addresses already in Step 1 from Overture) ──────
    log.info("STEP 5: Pass-through (addresses sourced in Step 1)")
    from config import DATA_PROC
    import shutil
    for _, abbr in states.items():
        src = DATA_PROC / f"buildings_rainfall_{abbr}.gpkg"
        dst = DATA_PROC / f"buildings_addressed_{abbr}.gpkg"
        if src.exists() and not dst.exists():
            shutil.copy(src, dst)
            log.info(f"[{abbr}] Copied rainfall → addressed")

    # ── Step 6 ─────────────────────────────────────────────────────────────────
    log.info("=" * 60)
    log.info("STEP 6: Viability scoring → buildings.json + state_scores.json")
    log.info("=" * 60)
    from scripts.s06_score import run as run_06
    run_06(states)

    # ── Step 7 (optional) ──────────────────────────────────────────────────────
    if args.cv:
        log.info("=" * 60)
        log.info("STEP 7: CLIP CV cooling tower confidence layer")
        log.info("=" * 60)
        from scripts.s07_cv_layer import run as run_07
        run_07()

    from config import BUILDINGS_JSON, STATE_SCORES_JSON
    import shutil

    # Sync output to frontend and backend data directories
    repo_root = Path(__file__).parent.parent
    sync_targets = [
        repo_root / "frontend" / "public" / "data",
        repo_root / "backend" / "data",
    ]
    for target_dir in sync_targets:
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy(BUILDINGS_JSON, target_dir / "buildings.json")
        shutil.copy(STATE_SCORES_JSON, target_dir / "state_scores.json")
        log.info(f"Synced output → {target_dir}")

    log.info("=" * 60)
    log.info("Pipeline complete!")
    log.info(f"  buildings.json    → {BUILDINGS_JSON}")
    log.info(f"  state_scores.json → {STATE_SCORES_JSON}")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
