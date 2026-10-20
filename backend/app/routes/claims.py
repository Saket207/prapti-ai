from datetime import datetime, timezone
import logging
import secrets
from typing import Dict, Any, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import get_current_user
from app.db import get_supabase_admin
from app.models import (
    ClaimCreateRequest,
    ClaimCreateResponse,
    ClaimVerifyRequest,
    ClaimVerifyResponse,
    MyClaimsResponse,
    ClaimSummary,
    ItemStatus,
    HandoverConfirmRequest,
    HandoverConfirmResponse,
)
from notifications.notify import notify_user_by_id

logger = logging.getLogger("prapti-claims")
router = APIRouter()

MAX_VERIFY_ATTEMPTS = 3


# =====================================================================
# POST /claims — Start a claim and receive the secret question
# =====================================================================
@router.post(
    "",
    response_model=ClaimCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate item claim",
    description="Starts a claim for a found item by an owner and returns the ownership verification challenge question.",
)
async def create_claim(
    payload: ClaimCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ClaimCreateResponse:
    supabase = get_supabase_admin()
    user_id = current_user["id"]
    lost_str_id = str(payload.lost_item_id)
    found_str_id = str(payload.found_item_id)

    # 1. Verify caller owns the lost item report
    try:
        lost_res = (
            supabase.table("items")
            .select("id, reporter_id, kind, status")
            .eq("id", lost_str_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.exception(f"Error fetching lost item {lost_str_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify lost item ownership.",
        )

    lost_item = lost_res.data if lost_res else None
    if not lost_item or lost_item["reporter_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only initiate claims for lost items you reported.",
        )

    # 2. Verify found item exists and is claimable
    found_res = (
        supabase.table("items")
        .select("id, kind, status")
        .eq("id", found_str_id)
        .maybe_single()
        .execute()
    )
    found_item = found_res.data if found_res else None
    if not found_item or found_item["kind"] != "found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Found item not found.",
        )

    if found_item["status"] not in ("found", "matched"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This found item is no longer available to be claimed.",
        )

    # 3. Retrieve secret challenge question (backend only)
    secret_res = (
        supabase.table("item_secrets")
        .select("question")
        .eq("item_id", found_str_id)
        .maybe_single()
        .execute()
    )
    secret_data = secret_res.data if secret_res else None
    if not secret_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification challenge not found for this item.",
        )

    # 4. Check if claim already exists between these two items
    existing_claim_res = (
        supabase.table("claims")
        .select("id, attempts, verified_at")
        .eq("lost_item_id", lost_str_id)
        .eq("found_item_id", found_str_id)
        .maybe_single()
        .execute()
    )
    existing_claim = existing_claim_res.data if existing_claim_res else None

    if existing_claim:
        claim_id = existing_claim["id"]
        attempts = existing_claim.get("attempts", 0)

        # If locked after 3 failed attempts
        if attempts >= MAX_VERIFY_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Claim locked. Maximum verification attempts exceeded.",
            )

        attempts_left = max(0, MAX_VERIFY_ATTEMPTS - attempts)
        return ClaimCreateResponse(
            claim_id=UUID(claim_id),
            question=secret_data["question"],
            attempts_left=attempts_left,
        )

    # 5. Insert new claim record
    new_claim_id = str(uuid4())
    now_dt = datetime.now(timezone.utc).isoformat()
    claim_payload = {
        "id": new_claim_id,
        "lost_item_id": lost_str_id,
        "found_item_id": found_str_id,
        "claimant_id": user_id,
        "attempts": 0,
        "created_at": now_dt,
    }

    try:
        supabase.table("claims").insert(claim_payload).execute()
    except Exception as exc:
        logger.exception(f"Error creating claim: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate claim.",
        )

    return ClaimCreateResponse(
        claim_id=UUID(new_claim_id),
        question=secret_data["question"],
        attempts_left=MAX_VERIFY_ATTEMPTS,
    )


# =====================================================================
# POST /claims/{id}/verify — Answer the secret challenge question
# =====================================================================
@router.post(
    "/{claim_id}/verify",
    response_model=ClaimVerifyResponse,
    summary="Verify claim answer",
    description="Submits an answer to the secret question. If correct, transitions items to 'matched' and generates QR token.",
)
async def verify_claim_answer(
    claim_id: UUID,
    payload: ClaimVerifyRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> ClaimVerifyResponse:
    supabase = get_supabase_admin()
    user_id = current_user["id"]
    str_claim_id = str(claim_id)

    # 1. Fetch the claim
    try:
        claim_res = (
            supabase.table("claims")
            .select("id, lost_item_id, found_item_id, claimant_id, attempts, qr_token, verified_at")
            .eq("id", str_claim_id)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.exception(f"Error querying claim {str_claim_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query claim record.",
        )

    claim_data = claim_res.data if claim_res else None
    if not claim_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found.",
        )

    # 2. Authorization: Only the claimant can verify
    if claim_data["claimant_id"] != user_id and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to verify this claim.",
        )

    # 3. Check attempt limit
    current_attempts = claim_data.get("attempts", 0)
    if current_attempts >= MAX_VERIFY_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Claim locked. Maximum verification attempts exceeded.",
        )

    # If already verified previously, return existing token
    if claim_data.get("verified_at") and claim_data.get("qr_token"):
        return ClaimVerifyResponse(
            verified=True,
            qr_token=claim_data["qr_token"],
            attempts_left=None,
        )

    # 4. Fetch the real secret answer from item_secrets table
    found_id = claim_data["found_item_id"]
    secret_res = (
        supabase.table("item_secrets")
        .select("answer")
        .eq("item_id", found_id)
        .maybe_single()
        .execute()
    )
    secret_data = secret_res.data if secret_res else None
    if not secret_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret answer not found for this item.",
        )

    # 5. Compare answers (case-insensitive and trimmed)
    expected_answer = secret_data["answer"].strip().lower()
    provided_answer = payload.answer.strip().lower()

    if provided_answer == expected_answer:
        # Correct answer! Generate secure QR handover token
        qr_token = f"prapti_{secrets.token_urlsafe(24)}"
        now_dt = datetime.now(timezone.utc).isoformat()

        # Update claim to verified
        supabase.table("claims").update(
            {"verified_at": now_dt, "qr_token": qr_token}
        ).eq("id", str_claim_id).execute()

        # Update both items to 'matched' status
        supabase.table("items").update(
            {"status": ItemStatus.MATCHED.value}
        ).in_("id", [claim_data["lost_item_id"], found_id]).execute()

        # Dispatch notification events (as specified in docs/api-contract.md)
        try:
            found_res = (
                supabase.table("items")
                .select("reporter_id, category")
                .eq("id", found_id)
                .maybe_single()
                .execute()
            )
            f_item = found_res.data if found_res else {}
            item_cat = f_item.get("category") or "item"
            finder_id = f_item.get("reporter_id")

            # 1. Notify finder that their secret question was verified
            if finder_id:
                notify_user_by_id(
                    "claim_received",
                    finder_id,
                    {"category": item_cat},
                    supabase_client=supabase
                )
                # Handover ready notification for finder
                notify_user_by_id(
                    "handover_ready",
                    finder_id,
                    {"category": item_cat, "qr_token": qr_token},
                    supabase_client=supabase
                )

            # 2. Notify claimant with QR handover pass
            notify_user_by_id(
                "handover_ready",
                claim_data["claimant_id"],
                {"category": item_cat, "qr_token": qr_token},
                supabase_client=supabase
            )
        except Exception as n_err:
            logger.warning(f"Notification dispatch failed during claim verify: {n_err}")

        return ClaimVerifyResponse(
            verified=True,
            qr_token=qr_token,
            attempts_left=None,
        )
    else:
        # Incorrect answer: Increment attempts count
        new_attempts = current_attempts + 1
        supabase.table("claims").update(
            {"attempts": new_attempts}
        ).eq("id", str_claim_id).execute()

        attempts_left = max(0, MAX_VERIFY_ATTEMPTS - new_attempts)

        if attempts_left == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Claim locked. Maximum verification attempts exceeded.",
            )

        return ClaimVerifyResponse(
            verified=False,
            qr_token=None,
            attempts_left=attempts_left,
        )


# =====================================================================
# GET /claims/mine — List claims made or received by student
# =====================================================================
@router.get(
    "/mine",
    response_model=MyClaimsResponse,
    summary="Get my claims",
    description="Returns all claims initiated by the student or for items they reported found.",
)
async def get_my_claims(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> MyClaimsResponse:
    supabase = get_supabase_admin()
    user_id = current_user["id"]

    try:
        # Fetch claims made by this student
        claims_res = (
            supabase.table("claims")
            .select("id, lost_item_id, found_item_id, score, verified_at, created_at")
            .eq("claimant_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        claims_data = claims_res.data or []

        result = []
        for c in claims_data:
            result.append(
                ClaimSummary(
                    id=UUID(c["id"]),
                    lost_item_id=UUID(c["lost_item_id"]),
                    found_item_id=UUID(c["found_item_id"]),
                    score=float(c["score"]) if c.get("score") is not None else None,
                    verified=bool(c.get("verified_at")),
                    created_at=datetime.fromisoformat(c["created_at"].replace("Z", "+00:00")),
                )
            )

        return MyClaimsResponse(claims=result)
    except Exception as exc:
        logger.exception(f"Error fetching claims for user {user_id}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve claims.",
        )


# =====================================================================
# POST /handover/confirm — Finder confirms physical handover via QR token
# =====================================================================
handover_router = APIRouter(prefix="/handover", tags=["Handover"])


@handover_router.post(
    "/confirm",
    response_model=HandoverConfirmResponse,
    summary="Confirm physical item handover",
    description="Finder (or admin) scans or enters the claimant's QR token to finalize handover and mark items as returned.",
)
async def confirm_handover(
    payload: HandoverConfirmRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> HandoverConfirmResponse:
    supabase = get_supabase_admin()
    user_id = current_user["id"]
    token = payload.qr_token.strip()

    # 1. Lookup claim by QR token
    try:
        claim_res = (
            supabase.table("claims")
            .select("id, lost_item_id, found_item_id, claimant_id, verified_at, returned_at")
            .eq("qr_token", token)
            .maybe_single()
            .execute()
        )
    except Exception as exc:
        logger.exception(f"Error checking handover token: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify handover token.",
        )

    claim_data = claim_res.data if claim_res else None
    if not claim_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired QR token.",
        )

    if claim_data.get("returned_at"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This item has already been marked as returned.",
        )

    # 2. Authorization: Only the finder who reported the found item (or admin) can confirm handover
    found_id = claim_data["found_item_id"]
    found_res = (
        supabase.table("items")
        .select("reporter_id")
        .eq("id", found_id)
        .maybe_single()
        .execute()
    )
    found_item = found_res.data if found_res else None
    is_finder = found_item and found_item["reporter_id"] == user_id
    is_admin = current_user.get("role") == "admin"

    if not (is_finder or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the student who found this item (or an administrator) can confirm handover.",
        )

    # 3. Mark claim as returned
    now_dt = datetime.now(timezone.utc).isoformat()
    try:
        supabase.table("claims").update(
            {"returned_at": now_dt}
        ).eq("id", claim_data["id"]).execute()

        # Update both lost item and found item status to 'returned'
        supabase.table("items").update(
            {"status": ItemStatus.RETURNED.value}
        ).in_("id", [claim_data["lost_item_id"], found_id]).execute()

        # Dispatch 'returned' event notification to both parties
        try:
            item_res = (
                supabase.table("items")
                .select("category")
                .eq("id", found_id)
                .maybe_single()
                .execute()
            )
            item_cat = (item_res.data or {}).get("category") or "item"

            # 1. Notify claimant
            if claim_data.get("claimant_id"):
                notify_user_by_id(
                    "returned",
                    claim_data["claimant_id"],
                    {"category": item_cat},
                    supabase_client=supabase
                )
            # 2. Notify finder
            if found_item and found_item.get("reporter_id"):
                notify_user_by_id(
                    "returned",
                    found_item["reporter_id"],
                    {"category": item_cat},
                    supabase_client=supabase
                )
        except Exception as n_err:
            logger.warning(f"Notification dispatch failed during handover confirmation: {n_err}")
    except Exception as exc:
        logger.exception(f"Error finalizing handover in database: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update handover status.",
        )

    return HandoverConfirmResponse(status=ItemStatus.RETURNED)
