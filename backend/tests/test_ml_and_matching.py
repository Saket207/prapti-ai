"""
Test suite for Prapti-AI ML multimodal embeddings, zero-shot tagging, and scoring engine.
"""

from datetime import datetime, timezone, timedelta
import io
import sys
from pathlib import Path
from PIL import Image

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.ml.clip import (
    generate_image_embedding,
    generate_text_embedding,
    compute_cosine_similarity,
    predict_category_and_color,
)
from app.ml.scoring import (
    compute_location_score,
    compute_time_score,
    compute_text_score,
    compute_visual_score,
    compute_composite_score,
)


def create_dummy_image_bytes(color: str = "red", size=(128, 128)) -> bytes:
    """Helper to generate in-memory JPEG bytes of a solid color image."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_clip_embeddings():
    print("Testing CLIP embeddings generation...")
    # 1. Text embedding
    txt_emb = generate_text_embedding("black leather wallet with college ID card")
    assert txt_emb is not None, "Text embedding should not be None"
    assert len(txt_emb) == 512, f"Expected 512-dim vector, got {len(txt_emb)}"

    # 2. Image embedding
    img_bytes = create_dummy_image_bytes(color="blue")
    img_emb = generate_image_embedding(img_bytes)
    assert img_emb is not None, "Image embedding should not be None"
    assert len(img_emb) == 512, f"Expected 512-dim vector, got {len(img_emb)}"

    # 3. Cosine similarity
    sim_self = compute_cosine_similarity(txt_emb, txt_emb)
    assert 0.99 <= sim_self <= 1.0, f"Self similarity should be ~1.0, got {sim_self}"

    # Missing vector fallback
    assert compute_cosine_similarity(None, txt_emb) == 0.0
    print("CLIP embeddings test PASSED.")


def test_zero_shot_tagging():
    print("Testing zero-shot tagging...")
    # Red image test
    red_img_bytes = create_dummy_image_bytes(color="red")
    cat, color = predict_category_and_color(red_img_bytes)
    assert color == "red", f"Expected predicted color 'red', got '{color}'"
    print(f"Zero-shot tagging returned category: {cat}, color: {color}")
    print("Zero-shot tagging test PASSED.")


def test_location_scoring():
    print("Testing location scoring...")
    # Same location
    assert compute_location_score("central_library", "central_library") == 1.00

    # Same sector (e.g. library and canteen if configured)
    score_same_sector = compute_location_score("central_library", "food_court_canteen")
    assert 0.15 <= score_same_sector <= 1.00

    # Unknown or distant
    distant_score = compute_location_score("central_library", "unknown_loc_xyz")
    assert distant_score == 0.15
    print("Location scoring test PASSED.")


def test_time_scoring():
    print("Testing time proximity scoring...")
    now = datetime.now(timezone.utc)

    # Within 1 hour
    t1 = now - timedelta(hours=1)
    assert compute_time_score(now, t1) == 1.00

    # Within 6 hours
    t2 = now - timedelta(hours=6)
    assert compute_time_score(now, t2) == 0.85

    # Within 18 hours
    t3 = now - timedelta(hours=18)
    assert compute_time_score(now, t3) == 0.70

    # Within 48 hours
    t4 = now - timedelta(hours=48)
    assert compute_time_score(now, t4) == 0.50

    # Beyond 1 week
    t5 = now - timedelta(days=10)
    assert compute_time_score(now, t5) == 0.10
    print("Time proximity scoring test PASSED.")


def test_text_and_visual_scoring():
    print("Testing text and visual scoring...")
    emb_phone_txt = generate_text_embedding("iPhone 13 with clear case")
    emb_phone_img = create_dummy_image_bytes(color="black")
    emb_phone_img_vec = generate_image_embedding(emb_phone_img)

    # Visual cross-modal score
    cross_score = compute_visual_score(
        img_emb1=None,
        img_emb2=emb_phone_img_vec,
        text_emb1=emb_phone_txt,
        text_emb2=None,
    )
    assert 0.0 <= cross_score <= 1.0, f"Cross-modal score should be in [0, 1], got {cross_score}"

    # Text semantic score with embeddings
    text_score = compute_text_score(
        desc1="iPhone 13",
        desc2="iPhone 13 pro",
        text_emb1=emb_phone_txt,
        text_emb2=emb_phone_txt,
    )
    assert text_score >= 0.95

    # Jaccard fallback
    jaccard_score = compute_text_score("lost blue umbrella", "found blue umbrella at cafeteria")
    assert jaccard_score > 0.50
    print("Text and visual scoring test PASSED.")


def test_composite_scoring():
    print("Testing composite score weights...")
    # Perfect match across all dimensions
    comp, breakdown = compute_composite_score(
        visual_score=1.00,
        text_score=1.00,
        location_score=1.00,
        time_score=1.00,
    )
    assert comp == 1.00
    assert breakdown == {"visual": 1.00, "text": 1.00, "location": 1.00, "time": 1.00}

    # Weight check: visual (35%) + text (35%) + location (20%) + time (10%)
    # Let visual=1.0 (0.35), text=0.0, loc=0.0, time=0.0 => 0.35
    c_vis, _ = compute_composite_score(1.0, 0.0, 0.0, 0.0, has_both_visual=True)
    assert c_vis == 0.35

    c_loc, _ = compute_composite_score(0.0, 0.0, 1.0, 0.0, has_both_visual=True)
    assert c_loc == 0.20

    print("Composite score test PASSED.")


if __name__ == "__main__":
    test_clip_embeddings()
    test_zero_shot_tagging()
    test_location_scoring()
    test_time_scoring()
    test_text_and_visual_scoring()
    test_composite_scoring()
    print("\nALL ML & SCORING TESTS PASSED!")
