"""
Multimodal candidate scoring engine for Prapti-AI.
Combines visual embeddings, text semantics, campus spatial proximity,
and temporal proximity into a unified ranking score.
"""

from datetime import datetime
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from app.ml.clip import compute_cosine_similarity

logger = logging.getLogger("prapti-scoring")

# Load campus locations metadata
LOCATIONS_FILE = Path(__file__).resolve().parent.parent.parent.parent / "shared" / "campus_locations.json"
_LOCATION_METADATA: Optional[Dict[str, Dict[str, Any]]] = None


def get_location_metadata() -> Dict[str, Dict[str, Any]]:
    """
    Returns a lookup table of campus locations mapped by ID.
    Cached in memory for high-performance candidate scoring loops.
    """
    global _LOCATION_METADATA
    if _LOCATION_METADATA is None:
        try:
            if LOCATIONS_FILE.exists():
                with open(LOCATIONS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    _LOCATION_METADATA = {item["id"]: item for item in data if "id" in item}
            else:
                _LOCATION_METADATA = {}
        except Exception as exc:
            logger.error(f"Error reading {LOCATIONS_FILE}: {exc}")
            _LOCATION_METADATA = {}
    return _LOCATION_METADATA


def compute_location_score(loc1: str, loc2: str) -> float:
    """
    Computes spatial score based on DSCE campus hierarchy:
    - Identical location: 1.00
    - Same sector (e.g., Engineering Core): 0.65
    - Same zone (e.g., North Campus): 0.40
    - Distant campus zones: 0.15
    """
    if loc1 == loc2:
        return 1.00

    meta = get_location_metadata()
    i1 = meta.get(loc1, {})
    i2 = meta.get(loc2, {})

    if i1 and i2:
        if i1.get("sector") and i1.get("sector") == i2.get("sector"):
            return 0.65
        if i1.get("zone") and i1.get("zone") == i2.get("zone"):
            return 0.40

    return 0.15


def compute_time_score(dt1: datetime, dt2: datetime) -> float:
    """
    Computes temporal proximity score between lost and found event times:
    - Within 2 hours: 1.00
    - Within 12 hours: 0.85
    - Within 24 hours: 0.70
    - Within 72 hours (3 days): 0.50
    - Beyond 3 days: Linear decay down to minimum 0.10
    """
    try:
        hours_diff = abs((dt1 - dt2).total_seconds()) / 3600.0
        if hours_diff <= 2.0:
            return 1.00
        elif hours_diff <= 12.0:
            return 0.85
        elif hours_diff <= 24.0:
            return 0.70
        elif hours_diff <= 72.0:
            return 0.50
        else:
            return max(0.10, round(1.00 - (hours_diff / 168.0), 2))
    except Exception as exc:
        logger.warning(f"Error computing time score: {exc}")
        return 0.50


def compute_text_score(
    desc1: Optional[str],
    desc2: Optional[str],
    text_emb1: Any = None,
    text_emb2: Any = None,
) -> float:
    """
    Computes text semantic similarity using CLIP text embeddings when available,
    falling back to Jaccard word-overlap if embeddings are missing.
    """
    # 1. Use CLIP text embeddings if both vectors are present
    if text_emb1 is not None and text_emb2 is not None:
        return compute_cosine_similarity(text_emb1, text_emb2)

    # 2. Text string Jaccard fallback
    if not desc1 or not desc2:
        return 0.00

    w1 = set(desc1.lower().split())
    w2 = set(desc2.lower().split())
    if not w1 or not w2:
        return 0.00

    intersection = len(w1 & w2)
    union = len(w1 | w2)
    jaccard = intersection / max(union, 1)
    return round(float(np.clip(jaccard * 1.5, 0.0, 1.0)), 2)


def compute_visual_score(
    img_emb1: Any = None,
    img_emb2: Any = None,
    text_emb1: Any = None,
    text_emb2: Any = None,
) -> float:
    """
    Computes visual similarity score using CLIP 512-dim multimodal vectors:
    - Image-to-Image cosine similarity when both items have photos.
    - Cross-modal Image-to-Text cosine similarity when one item is text-only (e.g. lost report with description)
      and the other has an image.
    - Returns 0.00 (no free points) when no images are involved.
    """
    # 1. Direct image-to-image similarity
    if img_emb1 is not None and img_emb2 is not None:
        return compute_cosine_similarity(img_emb1, img_emb2)

    # 2. Cross-modal: lost item text vs found item image
    if text_emb1 is not None and img_emb2 is not None:
        return compute_cosine_similarity(text_emb1, img_emb2)

    # 3. Cross-modal: lost item image vs found item text
    if img_emb1 is not None and text_emb2 is not None:
        return compute_cosine_similarity(img_emb1, text_emb2)

    return 0.00


def compute_composite_score(
    visual_score: float,
    text_score: float,
    location_score: float,
    time_score: float,
    cat1: Optional[str] = None,
    cat2: Optional[str] = None,
    has_both_visual: bool = False,
    has_one_visual: bool = False,
) -> Tuple[float, Dict[str, float]]:
    """
    Calculates weighted composite score:
    - If BOTH photos exist: Visual 35%, Text 35%, Location 20%, Time 10%
    - If ONE photo exists: Cross-modal Visual 15%, Text 55%, Location 20%, Time 10%
    - If NO photos exist: Text 60%, Location 30%, Time 10%
    - Applies category mismatch penalty if items belong to completely different classes.
    """
    if has_both_visual:
        composite = (
            (visual_score * 0.35)
            + (text_score * 0.35)
            + (location_score * 0.20)
            + (time_score * 0.10)
        )
    elif has_one_visual:
        composite = (
            (visual_score * 0.15)
            + (text_score * 0.55)
            + (location_score * 0.20)
            + (time_score * 0.10)
        )
    else:
        composite = (
            (text_score * 0.60)
            + (location_score * 0.30)
            + (time_score * 0.10)
        )

    # Severe penalty if categories are known and completely incompatible (e.g., earphones vs stationery)
    if cat1 and cat2:
        c1 = str(cat1).strip().lower()
        c2 = str(cat2).strip().lower()
        if c1 != c2:
            composite *= 0.25

    composite = round(max(0.00, min(1.00, composite)), 2)

    breakdown = {
        "visual": round(visual_score, 2),
        "text": round(text_score, 2),
        "location": round(location_score, 2),
        "time": round(time_score, 2),
    }

    return composite, breakdown
