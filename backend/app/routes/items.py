from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.auth import get_current_user
from app.db import get_supabase_admin
from app.models import (
    ItemResponse,
    ItemKind,
    ItemStatus,
    LostItemCreatedResponse,
    MatchResponse,
    MatchBreakdown,
)
from app.ml.privacy_blur import redact_image_for_privacy
from app.ml.clip import (
    generate_image_embedding,
    generate_text_embedding,
    predict_category_and_color,
)
from app.ml.scoring import (
    LOCATIONS_FILE,
    get_location_metadata,
    compute_location_score,
    compute_time_score,
    compute_text_score,
    compute_visual_score,
    compute_composite_score,
)

logger = logging.getLogger("prapti-items")
router = APIRouter()

_VALID_LOCATIONS: Optional[set] = None


def get_valid_location_ids() -> set:
    """
    Returns the set of all valid location IDs from shared/campus_locations.json.
    Cached in memory after initial read for maximum performance.
    """
    global _VALID_LOCATIONS
    if _VALID_LOCATIONS is None:
        try:
            if LOCATIONS_FILE.exists():
                with open(LOCATIONS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    _VALID_LOCATIONS = {item["id"] for item in data if "id" in item}
            else:
                _VALID_LOCATIONS = set()
        except Exception as e:
            logger.error(f"Failed to load campus locations: {e}")
            _VALID_LOCATIONS = set()
    return _VALID_LOCATIONS


def validate_location(location_id: str) -> None:
    """
    Validates that the given location_id exists in campus_locations.json.
    Raises HTTP 400 if invalid.
    """
    valid_ids = get_valid_location_ids()
    if valid_ids and location_id not in valid_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid location_id '{location_id}'. Must be a recognized DSCE campus location.",
        )


def build_blurred_public_url(supabase_url: Any, path: Optional[str]) -> Optional[str]:
    """
    Constructs a normalized public URL for blurred images without duplicate slashes.
    """
    if not path:
        return None
    base = str(supabase_url).rstrip("/")
    return f"{base}/storage/v1/object/public/blurred/{path}"



# =====================================================================
# POST /items/found — Report a found item (multipart form)
# =====================================================================
@router.post(
    "/found",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report found item",
    description="Uploads a found item with photo and secret challenge. Blurs faces and ID cards before saving to public storage.",
)
async def report_found_item(
    photo: UploadFile = File(..., description="Item photograph (JPEG, PNG, or WebP, max 5MB)"),
    location_id: str = Form(..., description="Campus location ID from shared/campus_locations.json"),
    secret_question: str = Form(..., min_length=3, description="Ownership verification question set by finder"),
    secret_answer: str = Form(..., min_length=1, description="Secret answer required to claim the item"),
    description: Optional[str] = Form(None, description="Optional textual description"),
    event_time: Optional[str] = Form(None, description="ISO timestamp when the item was found"),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ItemResponse:
    # 1. Validate campus location
    validate_location(location_id)

    # 2. Validate photo type & size (max 5 MB)
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    content_type = photo.content_type or "image/jpeg"
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo must be JPEG, PNG, or WebP format.",
        )

    photo_bytes = await photo.read()
    if len(photo_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Photo exceeds the maximum allowed size of 5 MB.",
        )
    if len(photo_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded photo file is empty.",
        )

    # 3. Privacy redaction (blur faces and ID card strips)
    blurred_bytes = redact_image_for_privacy(photo_bytes)

    # 4. Generate unique item ID and storage file paths
    item_id = str(uuid4())
    original_path = f"{item_id}/original.jpg"
    blurred_path = f"{item_id}/blurred.jpg"

    # 5. Parse event time
    now_dt = datetime.now(timezone.utc)
    if event_time:
        try:
            event_dt = datetime.fromisoformat(event_time.replace("Z", "+00:00"))
        except Exception:
            event_dt = now_dt
    else:
        event_dt = now_dt

    supabase = get_supabase_admin()

    # 6. Generate CLIP multimodal embeddings and predict category & color
    image_emb = generate_image_embedding(photo_bytes)
    text_emb = generate_text_embedding(description) if description else None
    pred_category, pred_color = predict_category_and_color(photo_bytes)

    # 7. Upload images to Supabase Storage buckets
    try:
        supabase.storage.from_("originals").upload(
            path=original_path,
            file=photo_bytes,
            file_options={"content-type": content_type},
        )
        supabase.storage.from_("blurred").upload(
            path=blurred_path,
            file=blurred_bytes,
            file_options={"content-type": "image/jpeg"},
        )
    except Exception as exc:
        logger.warning(f"Storage upload notice (continuing with DB record): {exc}")

    # 8. Insert item record into items table
    item_payload = {
        "id": item_id,
        "reporter_id": current_user["id"],
        "kind": ItemKind.FOUND.value,
        "status": ItemStatus.FOUND.value,
        "description": description.strip() if description else None,
        "category": pred_category,
        "color": pred_color,
        "location_id": location_id,
        "event_time": event_dt.isoformat(),
        "original_image_path": original_path,
        "blurred_image_path": blurred_path,
        "image_embedding": image_emb,
        "text_embedding": text_emb,
        "created_at": now_dt.isoformat(),
    }

    try:
        supabase.table("items").insert(item_payload).execute()

        # 9. Insert secret challenge into item_secrets table (backend only)
        secret_payload = {
            "item_id": item_id,
            "question": secret_question.strip(),
            "answer": secret_answer.strip().lower(),
        }
        supabase.table("item_secrets").insert(secret_payload).execute()
    except Exception as exc:
        logger.exception(f"Database insertion error for found item {item_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save found item. Please try again.",
        )

    blurred_url = build_blurred_public_url(supabase.supabase_url, blurred_path)

    return ItemResponse(
        id=UUID(item_id),
        kind=ItemKind.FOUND,
        status=ItemStatus.FOUND,
        description=item_payload["description"],
        category=pred_category,
        color=pred_color,
        location_id=location_id,
        event_time=event_dt,
        blurred_image_url=blurred_url,
        created_at=now_dt,
    )



# =====================================================================
# POST /items/lost — Report a lost item and discover potential matches
# =====================================================================
@router.post(
    "/lost",
    response_model=LostItemCreatedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report lost item",
    description="Registers a lost item report and returns top matching found items based on multimodal criteria.",
)
async def report_lost_item(
    location_id: str = Form(..., description="Campus location ID where item was lost"),
    photo: Optional[UploadFile] = File(None, description="Optional photo of the lost item"),
    description: Optional[str] = Form(None, description="Optional description of the lost item"),
    event_time: Optional[str] = Form(None, description="Approximate ISO time when the item was lost"),
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> LostItemCreatedResponse:
    # 1. Contract rule check: At least one of photo or description is required
    has_description = bool(description and description.strip())
    has_photo = bool(photo and photo.filename and photo.size != 0)

    if not has_description and not has_photo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of photo or description is required to report a lost item.",
        )

    # 2. Validate campus location
    validate_location(location_id)

    item_id = str(uuid4())
    original_path = None
    blurred_path = None
    blurred_url = None

    # 3. Handle optional photo
    if has_photo and photo is not None:
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        content_type = photo.content_type or "image/jpeg"
        if content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Photo must be JPEG, PNG, or WebP format.",
            )

        photo_bytes = await photo.read()
        if len(photo_bytes) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Photo exceeds the maximum allowed size of 5 MB.",
            )

        if len(photo_bytes) > 0:
            blurred_bytes = redact_image_for_privacy(photo_bytes)
            original_path = f"{item_id}/original.jpg"
            blurred_path = f"{item_id}/blurred.jpg"

            supabase = get_supabase_admin()
            try:
                supabase.storage.from_("originals").upload(
                    original_path, photo_bytes, {"content-type": content_type}
                )
                supabase.storage.from_("blurred").upload(
                    blurred_path, blurred_bytes, {"content-type": "image/jpeg"}
                )
                blurred_url = build_blurred_public_url(supabase.supabase_url, blurred_path)
            except Exception as exc:
                logger.warning(f"Storage upload notice (lost item): {exc}")
    else:
        supabase = get_supabase_admin()

    # 4. Parse event time and generate CLIP embeddings
    now_dt = datetime.now(timezone.utc)
    if event_time:
        try:
            event_dt = datetime.fromisoformat(event_time.replace("Z", "+00:00"))
        except Exception:
            event_dt = now_dt
    else:
        event_dt = now_dt

    lost_image_emb = generate_image_embedding(photo_bytes) if (has_photo and 'photo_bytes' in locals()) else None
    lost_text_emb = generate_text_embedding(description) if has_description else None
    pred_category, pred_color = (
        predict_category_and_color(photo_bytes) if (has_photo and 'photo_bytes' in locals()) else (None, None)
    )

    # 5. Insert lost item into items table
    item_payload = {
        "id": item_id,
        "reporter_id": current_user["id"],
        "kind": ItemKind.LOST.value,
        "status": ItemStatus.LOST.value,
        "description": description.strip() if description else None,
        "category": pred_category,
        "color": pred_color,
        "location_id": location_id,
        "event_time": event_dt.isoformat(),
        "original_image_path": original_path,
        "blurred_image_path": blurred_path,
        "image_embedding": lost_image_emb,
        "text_embedding": lost_text_emb,
        "created_at": now_dt.isoformat(),
    }

    try:
        supabase.table("items").insert(item_payload).execute()
    except Exception as exc:
        logger.exception(f"Database insertion error for lost item {item_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register lost item.",
        )

    created_item = ItemResponse(
        id=UUID(item_id),
        kind=ItemKind.LOST,
        status=ItemStatus.LOST,
        description=item_payload["description"],
        category=item_payload["category"],
        color=item_payload["color"],
        location_id=location_id,
        event_time=event_dt,
        blurred_image_url=blurred_url,
        created_at=now_dt,
    )

    # 6. Candidate match search: Fetch active found items
    matches: List[MatchResponse] = []
    try:
        candidates_res = (
            supabase.table("items")
            .select(
                "id, kind, status, description, category, color, location_id, event_time, blurred_image_path, image_embedding, text_embedding, created_at"
            )
            .eq("kind", "found")
            .in_("status", ["found", "matched"])
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        candidates = candidates_res.data or []

        scored_candidates = []
        for cand in candidates:
            cand_time = datetime.fromisoformat(cand["event_time"].replace("Z", "+00:00"))

            score_loc = compute_location_score(location_id, cand["location_id"])
            score_time = compute_time_score(event_dt, cand_time)
            score_text = compute_text_score(
                item_payload["description"],
                cand.get("description"),
                lost_text_emb,
                cand.get("text_embedding"),
            )
            score_visual = compute_visual_score(
                lost_image_emb,
                cand.get("image_embedding"),
                lost_text_emb,
                cand.get("text_embedding"),
            )

            composite_score, breakdown_dict = compute_composite_score(
                score_visual, score_text, score_loc, score_time
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

            scored_candidates.append(
                MatchResponse(
                    found_item=cand_item,
                    score=composite_score,
                    breakdown=breakdown,
                )
            )

        # Sort by composite score descending and pick top 3 (only above threshold 0.40)
        scored_candidates.sort(key=lambda m: m.score, reverse=True)
        matches = [m for m in scored_candidates if m.score >= 0.40][:3]

    except Exception as exc:
        logger.warning(f"Notice: Candidate matching search non-critical failure: {exc}")
        matches = []

    return LostItemCreatedResponse(
        item=created_item,
        matches=matches,
    )



# =====================================================================
# GET /items/mine — View all items reported by the logged-in student
# =====================================================================
@router.get(
    "/mine",
    response_model=List[ItemResponse],
    summary="Get my reported items",
    description="Returns all lost and found items reported by the currently authenticated student.",
)
async def get_my_items(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> List[ItemResponse]:
    try:
        supabase = get_supabase_admin()
        user_id = current_user["id"]
        
        # Query items table for items reported by this student
        response = (
            supabase.table("items")
            .select(
                "id, kind, status, description, category, color, location_id, event_time, blurred_image_path, created_at"
            )
            .eq("reporter_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        items_data = response.data or []
        
        # Map database fields to ItemResponse model
        result = []
        for row in items_data:
            # Construct public URL for blurred image if path exists
            blurred_url = build_blurred_public_url(supabase.supabase_url, row.get("blurred_image_path"))
            
            result.append(
                ItemResponse(
                    id=row["id"],
                    kind=row["kind"],
                    status=row["status"],
                    description=row.get("description"),
                    category=row.get("category"),
                    color=row.get("color"),
                    location_id=row["location_id"],
                    event_time=row["event_time"],
                    blurred_image_url=blurred_url,
                    created_at=row["created_at"],
                )
            )
        return result
    except Exception as exc:
        logger.exception(f"Error fetching items for user {current_user.get('id')}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve items. Please try again later.",
        )


# =====================================================================
# GET /items/{id} — View details and status history of a specific item
# =====================================================================
@router.get(
    "/{item_id}",
    summary="Get single item with status history",
    description="Fetches an item by UUID along with its status transition history. Accessible by the reporter, finder, or admin.",
)
async def get_item_by_id(
    item_id: UUID,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        supabase = get_supabase_admin()
        str_id = str(item_id)
        
        # Fetch the item
        item_res = (
            supabase.table("items")
            .select(
                "id, reporter_id, kind, status, description, category, color, location_id, event_time, blurred_image_path, created_at"
            )
            .eq("id", str_id)
            .maybe_single()
            .execute()
        )
        
        item_data = item_res.data
        if not item_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found.",
            )
        
        # Check permissions: reporter, admin, or open found item
        user_id = current_user["id"]
        is_owner = item_data["reporter_id"] == user_id
        is_admin = current_user.get("role") == "admin"
        is_public_found = item_data["kind"] == "found" and item_data["status"] in ("found", "matched")
        
        if not (is_owner or is_admin or is_public_found):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this item's details.",
            )
        
        # Fetch status history audit log
        history_res = (
            supabase.table("status_history")
            .select("old_status, new_status, note, created_at")
            .eq("item_id", str_id)
            .order("created_at", desc=False)
            .execute()
        )
        
        # Construct public blurred image URL
        blurred_url = build_blurred_public_url(supabase.supabase_url, item_data.get("blurred_image_path"))
            
        clean_item = ItemResponse(
            id=item_data["id"],
            kind=item_data["kind"],
            status=item_data["status"],
            description=item_data.get("description"),
            category=item_data.get("category"),
            color=item_data.get("color"),
            location_id=item_data["location_id"],
            event_time=item_data["event_time"],
            blurred_image_url=blurred_url,
            created_at=item_data["created_at"],
        )
        
        return {
            "item": clean_item.model_dump(),
            "history": history_res.data or [],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Error fetching item {item_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve item details.",
        )
