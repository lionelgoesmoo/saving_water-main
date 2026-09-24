"""
Step 7 (optional): CLIP-based zero-shot cooling tower detection.

For the top-N buildings by viability score:
  1. Fetch a satellite tile from Google Maps Static API.
  2. Run CLIP to compare the tile against text prompts.
  3. Update cooling_tower_confidence with the visual confirmation score.
  4. Save the tile image to output/tiles/ for display in the frontend.

Requires:
  pip install transformers torch Pillow requests
  GOOGLE_MAPS_API_KEY environment variable set

Run AFTER 06_score.py.  Updates buildings.json in place.
"""

import sys
import json
import logging
import time
from pathlib import Path
from io import BytesIO

import requests
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import (
    GOOGLE_MAPS_API_KEY,
    SATELLITE_TILE_ZOOM,
    SATELLITE_TILE_SIZE,
    BUILDINGS_JSON,
    TILES_DIR,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

TOP_N          = 100          # number of buildings to run CV on
REQUEST_DELAY  = 0.1          # seconds between Google API calls (rate limit)

# CLIP text prompts for cooling tower detection
POSITIVE_PROMPT = "aerial satellite view of large industrial building rooftop with cooling towers or HVAC equipment"
NEGATIVE_PROMPT = "aerial satellite view of flat commercial rooftop without cooling towers"


def load_clip():
    try:
        from transformers import CLIPProcessor, CLIPModel
        import torch
        log.info("Loading CLIP model (openai/clip-vit-base-patch32) ...")
        model     = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        model.eval()
        return model, processor, torch
    except ImportError:
        raise ImportError(
            "Install CV dependencies: pip install transformers torch Pillow"
        )


def fetch_satellite_tile(lat: float, lon: float, building_id: str) -> Image.Image | None:
    """Download a satellite tile from Google Maps Static API."""
    tile_path = TILES_DIR / f"{building_id}.jpg"
    if tile_path.exists():
        return Image.open(tile_path)

    if not GOOGLE_MAPS_API_KEY:
        log.warning("GOOGLE_MAPS_API_KEY not set. Using placeholder tile.")
        return None

    url = (
        f"https://maps.googleapis.com/maps/api/staticmap"
        f"?center={lat},{lon}"
        f"&zoom={SATELLITE_TILE_ZOOM}"
        f"&size={SATELLITE_TILE_SIZE}"
        f"&maptype=satellite"
        f"&key={GOOGLE_MAPS_API_KEY}"
    )
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        img = Image.open(BytesIO(resp.content)).convert("RGB")
        img.save(tile_path, "JPEG", quality=85)
        return img
    except Exception as e:
        log.warning(f"Failed to fetch tile for {building_id}: {e}")
        return None


def clip_confidence(
    image: Image.Image,
    model,
    processor,
    torch,
) -> float:
    """
    Returns probability [0,1] that the image shows a cooling tower.
    """
    texts  = [POSITIVE_PROMPT, NEGATIVE_PROMPT]
    inputs = processor(
        text=texts, images=image,
        return_tensors="pt", padding=True, truncation=True
    )
    with torch.no_grad():
        outputs  = model(**inputs)
        logits   = outputs.logits_per_image   # shape [1, 2]
        probs    = logits.softmax(dim=1)
    return float(probs[0][0])  # probability of positive (has cooling tower)


def run(top_n: int = TOP_N):
    if not BUILDINGS_JSON.exists():
        raise FileNotFoundError(
            f"Run 06_score.py first. Missing: {BUILDINGS_JSON}"
        )

    with open(BUILDINGS_JSON) as f:
        buildings = json.load(f)

    # Sort by viability score, take top N
    buildings.sort(key=lambda b: b.get("viability_score", 0), reverse=True)
    to_process = buildings[:top_n]
    rest       = buildings[top_n:]

    model, processor, torch = load_clip()

    updated = 0
    for b in to_process:
        bid = b["building_id"]
        lat, lon = b["coordinates"]
        log.info(f"Processing {bid} (score={b['viability_score']}) ...")

        img = fetch_satellite_tile(lat, lon, bid)
        time.sleep(REQUEST_DELAY)

        if img is None:
            # No image available — keep existing confidence
            b["satellite_tile_path"] = f"tiles/{bid}.jpg"
            continue

        cv_score = clip_confidence(img, model, processor, torch)

        # Blend EPA-source confidence with visual confidence:
        # If EPA already flagged it, take max; if not, use CV score directly
        existing_conf = b.get("cooling_tower_confidence", 0.0)
        if b.get("cooling_tower"):
            # EPA-confirmed + CV: blended (EPA confidence is authoritative, CV supplements)
            blended = existing_conf * 0.6 + cv_score * 0.4
        else:
            # No EPA flag: rely on CV
            blended = cv_score
            if cv_score > 0.65:
                b["cooling_tower"]        = True
                b["cooling_tower_source"] = "CLIP_CV"

        b["cooling_tower_confidence"] = round(blended, 3)
        b["cv_raw_confidence"]        = round(cv_score, 3)
        b["satellite_tile_path"]      = f"tiles/{bid}.jpg"

        log.info(
            f"  CV score: {cv_score:.2f} | "
            f"blended: {blended:.2f} | "
            f"cooling_tower: {b['cooling_tower']}"
        )
        updated += 1

    # Recombine and write back
    final = to_process + rest
    with open(BUILDINGS_JSON, "w") as f:
        json.dump(final, f, indent=2, default=str)

    log.info(
        f"CV layer complete. Updated {updated}/{top_n} buildings. "
        f"Tiles saved to {TILES_DIR}"
    )


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else TOP_N
    run(top_n=n)
