"""
Tagging module for Prapti-AI.
Extracts category and color using CLIP zero-shot multimodal inference.
"""
from app.ml.clip import predict_category_and_color, CAMPUS_CATEGORIES, COMMON_COLORS

__all__ = ["predict_category_and_color", "CAMPUS_CATEGORIES", "COMMON_COLORS"]
