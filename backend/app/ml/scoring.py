"""
Multimodal candidate scoring engine for Prapti-AI.
Combines visual embeddings, text semantics, campus spatial proximity,
and temporal proximity into a unified ranking score.
"""

from datetime import datetime
import json
import logging
from pathlib import Path
import re
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
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


STOP_WORDS = {
    "lost", "found", "my", "a", "an", "the", "in", "at", "near", "on", "of",
    "some", "someone", "please", "help", "is", "it", "item", "i", "with",
    "and", "for", "to", "by", "from", "around", "have", "has", "had"
}


def extract_content_words(text: Optional[str]) -> set:
    if not text:
        return set()
    words = re.findall(r"[a-zA-Z0-9]+", text.lower())
    return {w for w in words if w not in STOP_WORDS and len(w) > 1}


COMPATIBLE_CATEGORIES = {
    "stationery": {"calculator", "notebook"},
    "calculator": {"stationery", "notebook"},
    "notebook": {"stationery", "calculator"},
    "electronics": {"charger", "phone", "earphones"},
    "charger": {"electronics", "phone"},
    "bag": {"wallet"},
    "wallet": {"bag"},
}


def compute_text_score(
    desc1: Optional[str],
    desc2: Optional[str],
    text_emb1: Any = None,
    text_emb2: Any = None,
    cat1: Optional[str] = None,
    cat2: Optional[str] = None,
) -> float:
    """
    Computes text semantic similarity combining zero-shot category validation,
    substantive keyword matching, and lexical grounding.
    Completely eliminates false high text scores between unrelated items (e.g., earbuds vs pen).
    """
    if not desc1 or not desc2:
        return 0.00

    # 1. Infer categories dynamically if missing
    c1 = cat1
    c2 = cat2
    if not c1 and desc1:
        from app.ml.clip import predict_category_from_text
        c1 = predict_category_from_text(desc1)
    if not c2 and desc2:
        from app.ml.clip import predict_category_from_text
        c2 = predict_category_from_text(desc2)

    # 2. Extract substantive content keywords (excluding stop/filler words)
    kw1 = extract_content_words(desc1)
    kw2 = extract_content_words(desc2)
    overlap = kw1 & kw2

    # Substring / stem matching (e.g. "earbud" in "earbuds", "keys" in "keychain", "sleeve" in "sleeves")
    has_stem_match = False
    for w1 in kw1:
        for w2 in kw2:
            if len(w1) >= 3 and len(w2) >= 3 and (w1 in w2 or w2 in w1):
                has_stem_match = True
                break
        if has_stem_match:
            break

    # 3. Category compatibility check
    if c1 and c2:
        s1 = str(c1).strip().lower()
        s2 = str(c2).strip().lower()
        if s1 != s2:
            is_compatible = s2 in COMPATIBLE_CATEGORIES.get(s1, set())
            if not is_compatible:
                return 0.02
            # If compatible categories, require keyword or stem overlap
            if not overlap and not has_stem_match:
                return 0.10

    # 4. If same category or compatible category with overlap:
    if c1 and c2 and str(c1).strip().lower() == str(c2).strip().lower():
        if overlap:
            ratio = len(overlap) / max(min(len(kw1), len(kw2)), 1)
            return round(min(1.00, 0.70 + 0.30 * ratio), 2)
        elif has_stem_match:
            return 0.80
        else:
            # Same category but completely different object/brand/color (e.g. boAt vs Apple, Honda key vs Room key)
            return 0.20

    # 5. Fallback if categories are unknown or compatible:
    if overlap:
        ratio = len(overlap) / max(min(len(kw1), len(kw2)), 1)
        return round(min(1.00, 0.50 + 0.50 * ratio), 2)
    elif has_stem_match:
        return 0.60

    return 0.05


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
