import io
import json
import logging
from typing import List, Optional, Tuple, Sequence, Any
import numpy as np
from PIL import Image

logger = logging.getLogger("prapti-clip")

_MODEL_NAME = "clip-ViT-B-32"
_clip_model = None

_CACHED_CAT_EMBS = None
_CACHED_COLOR_EMBS = None

# Standard lost & found campus item categories
CAMPUS_CATEGORIES = [
    "wallet",
    "phone",
    "keys",
    "bag",
    "bottle",
    "earphones",
    "id_card",
    "glasses",
    "notebook",
    "umbrella",
    "watch",
    "charger",
    "calculator",
    "clothing",
    "stationery",
]

# Common colors
COMMON_COLORS = [
    "black",
    "blue",
    "white",
    "red",
    "brown",
    "silver",
    "grey",
    "green",
    "yellow",
    "pink",
]


def get_clip_model():
    """
    Lazy-loads the SentenceTransformer CLIP model singleton.
    Cached in memory to avoid reload latency across requests.
    """
    global _clip_model
    if _clip_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading CLIP embedding model: {_MODEL_NAME}...")
            _clip_model = SentenceTransformer(_MODEL_NAME)
            logger.info("CLIP embedding model loaded successfully.")
        except Exception as exc:
            logger.error(f"Failed to load CLIP model '{_MODEL_NAME}': {exc}")
            raise
    return _clip_model


def generate_image_embedding(image_bytes: bytes) -> Optional[List[float]]:
    """
    Generates a 512-dimensional normalized float vector from image bytes using CLIP.
    Returns None if image cannot be opened or processed.
    """
    if not image_bytes:
        return None
    try:
        model = get_clip_model()
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        embedding = model.encode(pil_img, convert_to_numpy=True, normalize_embeddings=True)
        return [float(x) for x in embedding]
    except Exception as exc:
        logger.warning(f"Failed to generate CLIP image embedding: {exc}")
        return None


def generate_text_embedding(text: str) -> Optional[List[float]]:
    """
    Generates a 512-dimensional normalized float vector from text string using CLIP.
    Returns None if text is empty or invalid.
    """
    if not text or not text.strip():
        return None
    try:
        model = get_clip_model()
        embedding = model.encode(text.strip(), convert_to_numpy=True, normalize_embeddings=True)
        return [float(x) for x in embedding]
    except Exception as exc:
        logger.warning(f"Failed to generate CLIP text embedding: {exc}")
        return None


def compute_cosine_similarity(
    vec1: Any,
    vec2: Any,
) -> float:
    """
    Computes cosine similarity between two 512-dimensional vectors.
    Seamlessly parses database string representations from pgvector.
    Returns a normalized float between 0.00 and 1.00.
    Returns 0.00 if either vector is missing (no free points).
    """
    if vec1 is None or vec2 is None:
        return 0.00

    try:
        if isinstance(vec1, str):
            vec1 = json.loads(vec1)
        if isinstance(vec2, str):
            vec2 = json.loads(vec2)

        a = np.asarray(vec1, dtype=np.float32)
        b = np.asarray(vec2, dtype=np.float32)

        norm_a = float(np.linalg.norm(a))
        norm_b = float(np.linalg.norm(b))

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.00

        raw_cosine = float(np.dot(a, b) / (norm_a * norm_b))
        
        # In CLIP embedding space:
        # Unrelated concepts generally score <= 0.18
        # Moderate similarities score ~0.25 - 0.50
        # Strong semantic matches score >= 0.65
        # We rescale with a floor threshold so unrelated items score 0.00:
        if raw_cosine <= 0.18:
            return 0.00
            
        scaled = (raw_cosine - 0.18) / (1.0 - 0.18)
        return round(float(np.clip(scaled, 0.00, 1.00)), 2)
    except Exception as exc:
        logger.warning(f"Error computing cosine similarity: {exc}")
        return 0.00


def predict_category_and_color(
    image_bytes: bytes,
    candidate_categories: Optional[List[str]] = None,
    candidate_colors: Optional[List[str]] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Performs fast zero-shot classification on the given image using cached CLIP text embeddings.
    """
    if not image_bytes:
        return None, None

    global _CACHED_CAT_EMBS, _CACHED_COLOR_EMBS

    categories = candidate_categories or CAMPUS_CATEGORIES
    colors = candidate_colors or COMMON_COLORS

    try:
        model = get_clip_model()
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_emb = model.encode(pil_img, convert_to_numpy=True, normalize_embeddings=True)

        # 1. Predict Category (using in-memory cache)
        if _CACHED_CAT_EMBS is None or len(categories) != len(CAMPUS_CATEGORIES):
            cat_prompts = [f"a lost or found item: a {c}" for c in categories]
            _CACHED_CAT_EMBS = model.encode(cat_prompts, convert_to_numpy=True, normalize_embeddings=True)
            
        cat_sims = np.dot(_CACHED_CAT_EMBS, img_emb)
        best_cat_idx = int(np.argmax(cat_sims))
        best_category = categories[best_cat_idx]

        # 2. Predict Color (using in-memory cache)
        if _CACHED_COLOR_EMBS is None or len(colors) != len(COMMON_COLORS):
            color_prompts = [f"an object that is primarily {c} in color" for c in colors]
            _CACHED_COLOR_EMBS = model.encode(color_prompts, convert_to_numpy=True, normalize_embeddings=True)
            
        color_sims = np.dot(_CACHED_COLOR_EMBS, img_emb)
        best_color_idx = int(np.argmax(color_sims))
        best_color = colors[best_color_idx]

        return best_category, best_color
    except Exception as exc:
        logger.warning(f"CLIP zero-shot tagging failed: {exc}")
        return None, None


def predict_category_from_text(
    description: str,
    candidate_categories: Optional[List[str]] = None,
) -> Optional[str]:
    """
    Performs zero-shot classification on textual item descriptions using CLIP text-to-text semantic matching.
    """
    if not description or not description.strip():
        return None

    global _CACHED_CAT_EMBS

    categories = candidate_categories or CAMPUS_CATEGORIES

    try:
        model = get_clip_model()
        text_emb = model.encode(description.strip(), convert_to_numpy=True, normalize_embeddings=True)

        if _CACHED_CAT_EMBS is None or len(categories) != len(CAMPUS_CATEGORIES):
            cat_prompts = [f"a lost or found item: a {c}" for c in categories]
            _CACHED_CAT_EMBS = model.encode(cat_prompts, convert_to_numpy=True, normalize_embeddings=True)

        cat_sims = np.dot(_CACHED_CAT_EMBS, text_emb)
        best_cat_idx = int(np.argmax(cat_sims))
        return categories[best_cat_idx]
    except Exception as exc:
        logger.warning(f"CLIP zero-shot text tagging failed: {exc}")
        return None


