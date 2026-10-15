from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ItemKind(str, Enum):
    LOST = "lost"
    FOUND = "found"


class ItemStatus(str, Enum):
    LOST = "lost"
    FOUND = "found"
    MATCHED = "matched"
    RETURNED = "returned"


# ==========================================
# Core Item Schemas
# ==========================================

class ItemResponse(BaseModel):
    """
    Standard item object returned across all student and admin endpoints.
    Never exposes raw original photos or secret answers.
    """
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: ItemKind
    status: ItemStatus
    description: Optional[str] = None
    category: Optional[str] = None
    color: Optional[str] = None
    location_id: str
    event_time: datetime
    blurred_image_url: Optional[str] = None
    created_at: datetime


# ==========================================
# Matching Schemas
# ==========================================

class MatchBreakdown(BaseModel):
    visual: float = Field(..., ge=0.0, le=1.0, description="Visual similarity score")
    text: float = Field(..., ge=0.0, le=1.0, description="Text description similarity score")
    location: float = Field(..., ge=0.0, le=1.0, description="Location match score")
    time: float = Field(..., ge=0.0, le=1.0, description="Temporal proximity score")


class MatchResponse(BaseModel):
    found_item: ItemResponse
    score: float = Field(..., ge=0.0, le=1.0, description="Composite weighted match score")
    breakdown: MatchBreakdown


class MatchesListResponse(BaseModel):
    matches: List[MatchResponse] = Field(default_factory=list)


class LostItemCreatedResponse(BaseModel):
    item: ItemResponse
    matches: List[MatchResponse] = Field(default_factory=list)


# ==========================================
# Claim & Verification Schemas
# ==========================================

class ClaimCreateRequest(BaseModel):
    lost_item_id: UUID
    found_item_id: UUID


class ClaimCreateResponse(BaseModel):
    claim_id: UUID
    question: str
    attempts_left: int = 3


class ClaimVerifyRequest(BaseModel):
    answer: str = Field(..., min_length=1, description="Claimant's answer to the secret question")


class ClaimVerifyResponse(BaseModel):
    verified: bool
    qr_token: Optional[str] = None
    attempts_left: Optional[int] = None


class ClaimSummary(BaseModel):
    id: UUID
    lost_item_id: UUID
    found_item_id: UUID
    score: Optional[float] = None
    verified: bool
    created_at: datetime


class MyClaimsResponse(BaseModel):
    claims: List[ClaimSummary] = Field(default_factory=list)


# ==========================================
# Handover Schemas
# ==========================================

class HandoverConfirmRequest(BaseModel):
    qr_token: str = Field(..., min_length=6, description="Cryptographic QR token displayed by claimant")


class HandoverConfirmResponse(BaseModel):
    status: ItemStatus = ItemStatus.RETURNED


# ==========================================
# Admin Schemas
# ==========================================

class AdminStatusUpdateRequest(BaseModel):
    status: ItemStatus
    note: Optional[str] = None


class LocationStats(BaseModel):
    location_id: str
    lost: int
    found: int


class CategoryStats(BaseModel):
    category: str
    count: int


class AdminStatsResponse(BaseModel):
    by_status: Dict[str, int]
    by_location: List[LocationStats]
    by_category: List[CategoryStats]
    return_rate: float
