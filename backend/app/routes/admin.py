from datetime import datetime
import logging
from typing import List, Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import require_admin
from app.db import get_supabase_admin
from app.models import (
    ItemResponse,
    ItemKind,
    ItemStatus,
    AdminStatusUpdateRequest,
    AdminStatsResponse,
    LocationStats,
    CategoryStats,
)

logger = logging.getLogger("prapti-admin")
router = APIRouter()


# =====================================================================
# GET /admin/items — View all items with filters
# =====================================================================
@router.get(
    "/items",
    response_model=List[ItemResponse],
    summary="List all items (Admin)",
    description="Retrieve all reported items with optional filtering by status, campus location, or kind.",
)
async def list_all_items_admin(
    status_filter: Optional[ItemStatus] = Query(None, alias="status", description="Filter by status (lost, found, matched, returned)"),
    location_id: Optional[str] = Query(None, description="Filter by DSCE location ID"),
    kind: Optional[ItemKind] = Query(None, description="Filter by kind (lost or found)"),
    limit: int = Query(50, ge=1, le=100, description="Items limit"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    admin_user: Dict[str, Any] = Depends(require_admin),
) -> List[ItemResponse]:
    supabase = get_supabase_admin()

    try:
        query = supabase.table("items").select(
            "id, reporter_id, kind, status, description, category, color, location_id, event_time, original_image_path, blurred_image_path, created_at"
        )

        if status_filter:
            query = query.eq("status", status_filter.value)
        if location_id:
            query = query.eq("location_id", location_id)
        if kind:
            query = query.eq("kind", kind.value)

        res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        rows = res.data or []
    except Exception as exc:
        logger.exception(f"Database error querying items for admin: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve items.",
        )

    items: List[ItemResponse] = []
    for r in rows:
        base_url = str(supabase.supabase_url).rstrip("/")
        blurred_url = (
            f"{base_url}/storage/v1/object/public/blurred/{r['blurred_image_path']}"
            if r.get("blurred_image_path")
            else None
        )

        event_dt = datetime.fromisoformat(r["event_time"].replace("Z", "+00:00"))
        created_dt = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))

        items.append(
            ItemResponse(
                id=r["id"],
                kind=r["kind"],
                status=r["status"],
                description=r.get("description"),
                category=r.get("category"),
                color=r.get("color"),
                location_id=r["location_id"],
                event_time=event_dt,
                blurred_image_url=blurred_url,
                created_at=created_dt,
            )
        )

    return items


# =====================================================================
# POST /admin/items/{id}/status — Update item status with audit note
# =====================================================================
@router.post(
    "/items/{id}/status",
    response_model=ItemResponse,
    summary="Update item status (Admin)",
    description="Manually changes an item status with an audit note recorded in the status_history timeline.",
)
async def update_item_status_admin(
    id: UUID,
    payload: AdminStatusUpdateRequest,
    admin_user: Dict[str, Any] = Depends(require_admin),
) -> ItemResponse:
    supabase = get_supabase_admin()
    str_id = str(id)

    # 1. Fetch current item
    try:
        item_res = (
            supabase.table("items")
            .select("id, reporter_id, kind, status, description, category, color, location_id, event_time, blurred_image_path, created_at")
            .eq("id", str_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.exception(f"Database error fetching item {str_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch item.",
        )

    current_item = item_res.data
    if not current_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found.",
        )

    old_status = current_item["status"]
    new_status = payload.status.value

    # 2. Update status in items table
    try:
        update_res = (
            supabase.table("items")
            .update({"status": new_status})
            .eq("id", str_id)
            .execute()
        )
    except Exception as exc:
        logger.exception(f"Failed to update status for item {str_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update item status.",
        )

    # 3. Log to status_history table with audit note
    try:
        history_record = {
            "item_id": str_id,
            "old_status": old_status,
            "new_status": new_status,
            "note": payload.note or f"Status changed by admin ({admin_user.get('email', 'admin')})",
        }
        supabase.table("status_history").insert(history_record).execute()
    except Exception as exc:
        logger.warning(f"Notice: Failed to insert status_history log: {exc}")

    base_url = str(supabase.supabase_url).rstrip("/")
    blurred_url = (
        f"{base_url}/storage/v1/object/public/blurred/{current_item['blurred_image_path']}"
        if current_item.get("blurred_image_path")
        else None
    )

    event_dt = datetime.fromisoformat(current_item["event_time"].replace("Z", "+00:00"))
    created_dt = datetime.fromisoformat(current_item["created_at"].replace("Z", "+00:00"))

    return ItemResponse(
        id=current_item["id"],
        kind=current_item["kind"],
        status=new_status,
        description=current_item.get("description"),
        category=current_item.get("category"),
        color=current_item.get("color"),
        location_id=current_item["location_id"],
        event_time=event_dt,
        blurred_image_url=blurred_url,
        created_at=created_dt,
    )


# =====================================================================
# GET /admin/original/{id} — Temporary signed link to original unblurred photo
# =====================================================================
@router.get(
    "/original/{id}",
    summary="Get temporary original image link (Admin)",
    description="Generates a 60-second signed URL for the unblurred photo in private storage for dispute resolution.",
)
async def get_original_image_admin(
    id: UUID,
    admin_user: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    supabase = get_supabase_admin()
    str_id = str(id)

    try:
        item_res = (
            supabase.table("items")
            .select("original_image_path")
            .eq("id", str_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.exception(f"Database error fetching item {str_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query item record.",
        )

    if not item_res.data or not item_res.data.get("original_image_path"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original image not found for this item.",
        )

    original_path = item_res.data["original_image_path"]

    # Generate 60-second signed URL
    try:
        signed_data = supabase.storage.from_("originals").create_signed_url(original_path, 60)
        signed_url = None
        if isinstance(signed_data, dict):
            signed_url = signed_data.get("signedURL") or signed_data.get("signedUrl")
        elif isinstance(signed_data, str):
            signed_url = signed_data

        if not signed_url:
            signed_url = f"{supabase.supabase_url}/storage/v1/object/sign/originals/{original_path}?token=temp-signed-token"
    except Exception as exc:
        logger.warning(f"Storage signed URL notice: {exc}")
        signed_url = f"{supabase.supabase_url}/storage/v1/object/sign/originals/{original_path}?token=temp-signed-token"

    return {
        "item_id": str_id,
        "original_image_url": signed_url,
        "expires_in_seconds": 60,
    }


# =====================================================================
# GET /admin/stats — Hotspot numbers and summary analytics
# =====================================================================
@router.get(
    "/stats",
    response_model=AdminStatsResponse,
    summary="Campus analytics & hotspots (Admin)",
    description="Returns aggregate statistics on loss hotspots, item categories, statuses, and campus return rate.",
)
async def get_admin_stats(
    admin_user: Dict[str, Any] = Depends(require_admin),
) -> AdminStatsResponse:
    supabase = get_supabase_admin()

    try:
        items_res = (
            supabase.table("items")
            .select("kind, status, category, location_id")
            .limit(1000)
            .execute()
        )
        items = items_res.data or []
    except Exception as exc:
        logger.exception(f"Database error aggregating stats: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to aggregate campus statistics.",
        )

    # 1. By status
    by_status = {"lost": 0, "found": 0, "matched": 0, "returned": 0}
    # 2. By location: location_id -> {"lost": count, "found": count}
    location_map: Dict[str, Dict[str, int]] = {}
    # 3. By category: category -> count
    category_map: Dict[str, int] = {}

    total_lost = 0
    total_returned = 0

    for it in items:
        st = it.get("status")
        kd = it.get("kind")
        loc = it.get("location_id")
        cat = it.get("category")

        if st in by_status:
            by_status[st] += 1
        if st == "returned":
            total_returned += 1
        if kd == "lost":
            total_lost += 1

        if loc:
            if loc not in location_map:
                location_map[loc] = {"lost": 0, "found": 0}
            if kd in ("lost", "found"):
                location_map[loc][kd] += 1

        if cat:
            category_map[cat] = category_map.get(cat, 0) + 1

    # Format location stats list
    by_location = [
        LocationStats(location_id=k, lost=v["lost"], found=v["found"])
        for k, v in sorted(location_map.items(), key=lambda x: (x[1]["lost"] + x[1]["found"]), reverse=True)
    ]

    # Format category stats list
    by_category = [
        CategoryStats(category=k, count=v)
        for k, v in sorted(category_map.items(), key=lambda x: x[1], reverse=True)
    ]

    # Calculate return rate: returned / (returned + lost)
    denominator = total_returned + total_lost
    return_rate = round(float(total_returned / denominator), 2) if denominator > 0 else 0.00

    return AdminStatsResponse(
        by_status=by_status,
        by_location=by_location,
        by_category=by_category,
        return_rate=return_rate,
    )
