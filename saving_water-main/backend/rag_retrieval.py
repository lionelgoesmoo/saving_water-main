# rag_retrieval.py
from models import BuildingRecord
from rag_corpus import CORPUS


def retrieve_context(building: BuildingRecord, max_chunks: int = 4) -> str:
    active_tags = {
        building.state,
        building.recommended_angle,
        *( ["cooling_tower"] if building.cooling_tower_present else [] ),
        *( ["stormwater"]    if building.stormwater_fee_active  else [] ),
        *( ["ESG"]           if building.sbti_committed         else [] ),
        *( ["drought"]       if building.drought_risk_index > 6 else [] ),
    }
    scored = sorted(CORPUS, key=lambda c: len(set(c["tags"]) & active_tags), reverse=True)
    return "\n\n".join(f"[{c['source']}]\n{c['text']}" for c in scored[:max_chunks])
