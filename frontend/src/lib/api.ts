/**
 * Prapti-AI Typed API Client
 * Connects Next.js Frontend with the FastAPI Backend (docs/api-contract.md)
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ItemKind = "lost" | "found";
export type ItemStatus = "lost" | "found" | "matched" | "returned";

export interface Item {
  id: string;
  kind: ItemKind;
  status: ItemStatus;
  description: string | null;
  category: string | null;
  color: string | null;
  location_id: string;
  event_time: string;
  blurred_image_url: string | null;
  created_at: string;
}

export interface MatchBreakdown {
  visual: number;
  text: number;
  location: number;
  time: number;
}

export interface Match {
  found_item: Item;
  score: number;
  breakdown: MatchBreakdown;
}

export interface LostItemCreatedResponse {
  item: Item;
  matches: Match[];
}

export interface ClaimInitiateResponse {
  claim_id: string;
  question: string;
  attempts_left: number;
}

export interface ClaimVerifyResponse {
  verified: boolean;
  qr_token?: string;
  attempts_left?: number;
}

export interface AdminStats {
  by_status: Record<string, number>;
  by_location: Array<{ location_id: string; lost: number; found: number }>;
  by_category: Array<{ category: string; count: number }>;
  return_rate: number;
}

/**
 * Helper to build auth headers
 */
function getHeaders(token?: string, isJson = true): HeadersInit {
  const headers: Record<string, string> = {};
  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  // Fallback to dev test token in development if none supplied
  const effectiveToken = token || (process.env.NODE_ENV !== "production" ? "dev-test-student-token" : "");
  if (effectiveToken) {
    headers["Authorization"] = `Bearer ${effectiveToken}`;
  }
  return headers;
}

/**
 * Health check probe
 */
export async function getHealth(): Promise<{ status: string; uptime_seconds?: number }> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

/**
 * Report a found item (Multipart form data: photo, location_id, secret_question, secret_answer)
 */
export async function reportFoundItem(formData: FormData, token?: string): Promise<Item> {
  const res = await fetch(`${API_BASE_URL}/items/found`, {
    method: "POST",
    headers: getHeaders(token, false),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to report found item");
  }
  return res.json();
}

/**
 * Report a lost item (Multipart form data: photo?, description?, location_id, event_time?)
 */
export async function reportLostItem(formData: FormData, token?: string): Promise<LostItemCreatedResponse> {
  const res = await fetch(`${API_BASE_URL}/items/lost`, {
    method: "POST",
    headers: getHeaders(token, false),
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to report lost item");
  }
  return res.json();
}

/**
 * Get items reported by the current student
 */
export async function getMyItems(token?: string): Promise<Item[]> {
  const res = await fetch(`${API_BASE_URL}/items/mine`, {
    method: "GET",
    headers: getHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to fetch student items");
  }
  return res.json();
}

/**
 * Get top AI candidate matches for a lost report
 */
export async function getMatchesForLostItem(lostId: string, token?: string): Promise<Match[]> {
  const res = await fetch(`${API_BASE_URL}/matches/${lostId}`, {
    method: "GET",
    headers: getHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to fetch candidate matches");
  }
  const data = await res.json();
  return data.matches || [];
}

/**
 * Initiate an ownership claim to retrieve the secret question
 */
export async function initiateClaim(lostItemId: string, foundItemId: string, token?: string): Promise<ClaimInitiateResponse> {
  const res = await fetch(`${API_BASE_URL}/claims`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({ lost_item_id: lostItemId, found_item_id: foundItemId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to initiate claim");
  }
  return res.json();
}

/**
 * Verify secret answer for a claim
 */
export async function verifyClaimAnswer(claimId: string, answer: string, token?: string): Promise<ClaimVerifyResponse> {
  const res = await fetch(`${API_BASE_URL}/claims/${claimId}/verify`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Verification error");
  }
  return res.json();
}

/**
 * Confirm QR handover
 */
export async function confirmHandover(qrToken: string, token?: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE_URL}/handover/confirm`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({ qr_token: qrToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to confirm handover");
  }
  return res.json();
}

/**
 * Fetch campus analytics (Admin)
 */
export async function getAdminStats(token = "dev-test-admin-token"): Promise<AdminStats> {
  const res = await fetch(`${API_BASE_URL}/admin/stats`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to fetch admin stats");
  }
  return res.json();
}

/**
 * List all items for campus security review (Admin)
 */
export async function getAdminItems(
  filters?: { status?: string; location_id?: string; kind?: string },
  token = "dev-test-admin-token"
): Promise<Item[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.location_id) params.append("location_id", filters.location_id);
  if (filters?.kind) params.append("kind", filters.kind);

  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE_URL}/admin/items${qs}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to fetch admin items");
  }
  return res.json();
}

/**
 * Update an item's status with an audit note (Admin)
 */
export async function updateAdminItemStatus(
  itemId: string,
  newStatus: ItemStatus,
  note?: string,
  token = "dev-test-admin-token"
): Promise<Item> {
  const res = await fetch(`${API_BASE_URL}/admin/items/${itemId}/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: newStatus, note: note || "Status updated by admin console" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to update item status");
  }
  return res.json();
}

/**
 * Fetch temporary signed link to original unblurred photo for dispute resolution (Admin)
 */
export async function getAdminOriginalPhotoUrl(
  itemId: string,
  token = "dev-test-admin-token"
): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/admin/original/${itemId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to retrieve original photo");
  }
  const data = await res.json();
  return data.original_url;
}

