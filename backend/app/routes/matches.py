from datetime import datetime
import logging
from typing import Dict, Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user
from app.db import get_supabase_admin, build_blurred_public_url
from app.models import (
    ItemResponse,
    MatchesListResponse,
    MatchResponse,
    MatchBreakdown,
)
from app.ml.scoring import (
    compute_location_score,
    compute_time_score,
    compute_text_score,
    compute_visual_score,
    compute_composite_score,
)

logger = logging.getLogger("prapti-matches")
router = APIRouter()


# =====================================================================
# GET /matches/{lost_id} — Retrieve top 3 matches for a lost item
# =====================================================================
@router.get(
    "/{lost_id}",
    response_model=MatchesListResponse,
    summary="Get top matches for a lost item",
    description="Compares the specified lost item against all open found items and returns the top 3 matches above the threshold.",
)
async def get_matches_for_lost_item(
    lost_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> MatchesListResponse:
    supabase = get_supabase_admin()
    str_lost_id = str(lost_id)

    # 1. Fetch the lost item
    try:
        lost_res = (
            supabase.table("items")
            .select(
                "id, reporter_id, kind, status, description, category, color, location_id, event_time, blurred_image_path, image_embedding, text_embedding, created_at"
            )
            .eq("id", str_lost_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.exception(f"Database error fetching lost item {str_lost_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query item for matching.",
        )

    lost_data = lost_res.data if lost_res else None
    if not lost_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lost item not found.",
        )

    if lost_data["kind"] != "lost":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specified item is not a lost report. Matches can only be queried for lost items.",
        )

    # 2. Authorization: Only the owner who reported the lost item or an admin can view matches
    user_id = current_user["id"]
    is_owner = lost_data["reporter_id"] == user_id
    is_admin = current_user.get("role") == "admin"
    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view matches for this item.",
        )

    # 3. Parse lost item parameters
    lost_event_time = datetime.fromisoformat(lost_data["event_time"].replace("Z", "+00:00"))
    lost_location = lost_data["location_id"]
    lost_desc = lost_data.get("description")
    lost_img_emb = lost_data.get("image_embedding")
    lost_text_emb = lost_data.get("text_embedding")

    # 4. Fetch open found items to compare against
    try:
        candidates_res = (
            supabase.table("items")
            .select(
                "id, kind, status, description, category, color, location_id, event_time, blurred_image_path, image_embedding, text_embedding, created_at"
            )
            .eq("kind", "found")
            .in_("status", ["found", "matched"])
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        candidates = candidates_res.data or []
    except Exception as exc:
        logger.exception(f"Database error fetching candidate items: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query candidate items.",
        )

    # 5. Score candidates across 4 dimensions
    scored_matches: List[MatchResponse] = []
    for cand in candidates:
        cand_time = datetime.fromisoformat(cand["event_time"].replace("Z", "+00:00"))

        lost_cat = lost_data.get("category")
        cand_cat = cand.get("category")

        score_loc = compute_location_score(lost_location, cand["location_id"])
        score_time = compute_time_score(lost_event_time, cand_time)
        score_text = compute_text_score(
            lost_desc,
            cand.get("description"),
            lost_text_emb,
            cand.get("text_embedding"),
            cat1=lost_cat,
            cat2=cand_cat,
        )
        score_visual = compute_visual_score(
            lost_img_emb, cand.get("image_embedding"), lost_text_emb, cand.get("text_embedding")
        )

        has_both_visual = bool(lost_img_emb and cand.get("image_embedding"))
        has_one_visual = bool(lost_img_emb or cand.get("image_embedding")) and not has_both_visual
        composite_score, breakdown_dict = compute_composite_score(
            score_visual,
            score_text,
            score_loc,
            score_time,
            cat1=lost_cat,
            cat2=cand_cat,
            has_both_visual=has_both_visual,
            has_one_visual=has_one_visual,
        )

        cand_blurred_url = build_blurred_public_url(supabase.supabase_url, cand.get("blurred_image_path"))

        cand_item = ItemResponse(
            id=cand["id"],
            kind=cand["kind"],
            status=cand["status"],
            description=cand.get("description"),
            category=cand.get("category"),
            color=cand.get("color"),
            location_id=cand["location_id"],
            event_time=cand_time,
            blurred_image_url=cand_blurred_url,
            created_at=cand["created_at"],
        )

        breakdown = MatchBreakdown(
            visual=breakdown_dict["visual"],
            text=breakdown_dict["text"],
            location=breakdown_dict["location"],
            time=breakdown_dict["time"],
        )

        scored_matches.append(
            MatchResponse(
                found_item=cand_item,
                score=composite_score,
                breakdown=breakdown,
            )
        )

    # 6. Sort descending and filter top 3 (threshold >= 0.50)
    scored_matches.sort(key=lambda m: m.score, reverse=True)
    top_matches = [m for m in scored_matches if m.score >= 0.50][:3]

    return MatchesListResponse(matches=top_matches)

