# Prapti-AI API Contract (owner: Person 1)

Base URL: the Hugging Face Space URL (env: NEXT_PUBLIC_API_URL)
Auth: every request except /health sends `Authorization: Bearer <Supabase access token>`
Images: jpg / png / webp, max 5 MB. Requests with photos use multipart/form-data.
Status values (only these 4): lost, found, matched, returned
Errors: always `{"detail": "message"}` with code 400, 401, 403, 404, 409 or 422.

## Item object (returned everywhere)
```json
{
  "id": "uuid",
  "kind": "lost | found",
  "status": "lost | found | matched | returned",
  "description": "text or null",
  "category": "wallet | phone | keys | ... or null",
  "color": "black or null",
  "location_id": "id from shared/campus_locations.json",
  "event_time": "ISO time",
  "blurred_image_url": "public url or null",
  "created_at": "ISO time"
}
```
Never returned to students: original photo, secret answer.

## Endpoints
| Method + path | Who | Purpose |
|---|---|---|
| GET /health | anyone | `{"status":"ok"}`, also used by keep-awake |
| POST /items/found | student | Report found item |
| POST /items/lost | student | Report lost item |
| GET /items/mine | student | My items with status |
| GET /items/{id} | owner/admin | One item + status history |
| GET /matches/{lost_id} | owner | Top 3 matches for my lost item |
| POST /claims | owner | Start a claim, get the secret question |
| POST /claims/{id}/verify | owner | Answer the secret question |
| GET /claims/mine | student | Claims I made or received |
| POST /handover/confirm | finder | Scan/enter QR code, mark returned |
| GET /admin/items | admin | All items, filter `?status=&location_id=` |
| POST /admin/items/{id}/status | admin | Change status with a note |
| GET /admin/original/{id} | admin | Temporary link to original photo |
| GET /admin/stats | admin | Hotspot numbers for dashboard |

## Request / response details

**POST /items/found** (multipart)
Fields: `photo` (required), `location_id` (required), `event_time` (optional), `description` (optional), `secret_question` (required), `secret_answer` (required)
Returns: Item object (status `found`, category + color filled by AI, photo blurred).

**POST /items/lost** (multipart)
Fields: `photo` (optional), `description` (optional), `location_id` (required), `event_time` (optional). At least one of photo or description is required.
Returns: `{"item": Item, "matches": [Match]}`

**GET /matches/{lost_id}**
Returns: `{"matches": [Match]}` (0 to 3 items, only above the threshold)
```json
{
  "found_item": "Item object",
  "score": 0.82,
  "breakdown": {"visual": 0.9, "text": 0.7, "location": 1.0, "time": 0.6}
}
```

**POST /claims**
Body: `{"lost_item_id": "uuid", "found_item_id": "uuid"}`
Returns: `{"claim_id": "uuid", "question": "text", "attempts_left": 3}`

**POST /claims/{id}/verify**
Body: `{"answer": "text"}`
Returns: `{"verified": true, "qr_token": "string"}` or `{"verified": false, "attempts_left": 2}`
After 3 wrong answers the claim is locked (409). On success both items become `matched`.

**POST /handover/confirm**
Body: `{"qr_token": "string"}`
Returns: `{"status": "returned"}`. Only the finder of that item (or admin) can confirm.

**GET /claims/mine**
Returns: `{"claims": [{"id", "lost_item_id", "found_item_id", "score", "verified", "created_at"}]}`

**POST /admin/items/{id}/status**
Body: `{"status": "lost | found | matched | returned", "note": "text"}`

**GET /admin/stats**
Returns:
```json
{
  "by_status": {"lost": 0, "found": 0, "matched": 0, "returned": 0},
  "by_location": [{"location_id": "library", "lost": 5, "found": 3}],
  "by_category": [{"category": "wallet", "count": 4}],
  "return_rate": 0.42
}
```

## Notification events (backend calls notify(event, recipient, data))
- `match_found`: a new found item looks like a lost report (sent to the owner)
- `claim_received`: someone answered the secret correctly (sent to the finder)
- `handover_ready`: QR is ready (sent to both)
- `returned`: item handed over (sent to both)

## Not an endpoint
- Telegram chat id: the frontend saves it directly into `profiles.telegram_chat_id` with Supabase (allowed by RLS).
- Login: handled fully by Supabase Auth in the frontend.