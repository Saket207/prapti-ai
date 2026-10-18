import io
import logging
from typing import List, Optional, Tuple, Sequence
import numpy as np
from PIL import Image

logger = logging.getLogger("prapti-clip")

_MODEL_NAME = "clip-ViT-B-32"
_clip_model = None

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
    vec1: Optional[Sequence[float]],
    vec2: Optional[Sequence[float]],
) -> float:
    """
    Computes cosine similarity between two 512-dimensional vectors.
    Returns a float normalized between 0.0 and 1.0.
    If either vector is missing, returns a neutral baseline 0.5.
    """
    if not vec1 or not vec2:
        return 0.5

    try:
        a = np.asarray(vec1, dtype=np.float32)
        b = np.asarray(vec2, dtype=np.float32)

        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.5

        cosine_val = float(np.dot(a, b) / (norm_a * norm_b))
        # Map from [-1.0, 1.0] to [0.0, 1.0]
        mapped = (cosine_val + 1.0) / 2.0
        return round(float(np.clip(mapped, 0.0, 1.0)), 3)
    except Exception as exc:
        logger.warning(f"Error computing cosine similarity: {exc}")
        return 0.5


def predict_category_and_color(
    image_bytes: bytes,
    candidate_categories: Optional[List[str]] = None,
    candidate_colors: Optional[List[str]] = None,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Performs zero-shot classification on the given image using CLIP text-image similarity.
    Infers the most likely category and color of the found item.
    """
    if not image_bytes:
        return None, None

    categories = candidate_categories or CAMPUS_CATEGORIES
    colors = candidate_colors or COMMON_COLORS

    try:
        model = get_clip_model()
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_emb = model.encode(pil_img, convert_to_numpy=True, normalize_embeddings=True)

        # 1. Predict Category
        category_prompts = [f"a lost or found item: a {c}" for c in categories]
        cat_embs = model.encode(category_prompts, convert_to_numpy=True, normalize_embeddings=True)
        cat_sims = np.dot(cat_embs, img_emb)
        best_cat_idx = int(np.argmax(cat_sims))
        best_category = categories[best_cat_idx]

        # 2. Predict Color
        color_prompts = [f"an object that is primarily {c} in color" for c in colors]
        color_embs = model.encode(color_prompts, convert_to_numpy=True, normalize_embeddings=True)
        color_sims = np.dot(color_embs, img_emb)
        best_color_idx = int(np.argmax(color_sims))
        best_color = colors[best_color_idx]

        return best_category, best_color
    except Exception as exc:
        logger.warning(f"CLIP zero-shot tagging failed: {exc}")
        return None, None
