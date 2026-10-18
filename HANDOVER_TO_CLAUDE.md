# Handover to Claude — Prapti-AI

## 1. Project Overview & Context
Prapti-AI is a smart campus lost-and-found system for Dayananda Sagar College of Engineering, Bengaluru.
- **Stack**: Next.js (frontend) + FastAPI (backend) + Supabase (PostgreSQL with `pgvector` HNSW indexes) + CLIP multimodal embeddings (512-dim) + OpenCV/EasyOCR privacy blur.
- **Git Branch**: `feature/saket`

---

## 2. Current Project State
The project architecture, database schemas, and API contracts are fully designed and frozen. Implementation of backend code and shared data is the current priority.

### Work Ready & Present in Working Tree (Uncommitted):
- `docs/api-contract.md`: Endpoint specifications for students, admin, claims, and notification events.
- `supabase/schema.sql`: Full schema (`profiles`, `items`, `item_secrets`, `claims`, `status_history`), vector(512) HNSW indexes, triggers for user sync and audit logging, and storage buckets (`originals`, `blurred`).
- `supabase/rls.sql`: Row-Level Security rules enforcing that frontend only reads safe data while backend service key manages writes.

### Work Completed by Antigravity:
- Setup of project tracking and handover system (`PROJECT_STATUS.md`, `CHANGELOG_AI.md`, `HANDOVER_TO_CLAUDE.md`).
- Credentials hygiene: Live Supabase credentials safely isolated into gitignored `.env`; `.env.example` sanitized with dummy placeholders.
- Backend Core: `requirements.txt`, `config.py` (pydantic-settings), `db.py` (Supabase singleton), `models.py` (Pydantic models), `main.py` (FastAPI, CORS, `/health`).
- Campus Locations Data: `shared/campus_locations.json` populated with 14 authentic DSCE campus locations.
- AI Privacy-Blur Module: `backend/app/ml/privacy_blur.py` (CLAHE lighting equalization, multi-angle face detection, card/ID strip blurring, EXIF metadata stripping).
- Full Student API Suite Implemented & Verified:
  - `POST /items/found` (multipart photo upload, location validation, privacy blur, dual-bucket storage, secret challenge).
  - `POST /items/lost` (photo/description validation, location check, instant multi-factor candidate matching).
  - `GET /items/mine` (student's reported items).
  - `GET /items/{id}` (item details + audit status history).
  - `GET /matches/{lost_id}` (top-3 match retrieval and dynamic scoring breakdown).
  - `POST /claims` (initiating claim and getting secret question).
  - `POST /claims/{id}/verify` (3-attempt verification limit, status transition to `matched`, cryptographic `qr_token`).
  - `POST /handover/confirm` (finder/admin QR token confirmation, status transition to `returned`).
  - `GET /claims/mine` (active claims).

- Full AI Multimodal Suite Implemented & Verified:
  - `backend/app/ml/clip.py`: Singleton CLIP `clip-ViT-B-32` embedder generating 512-dim vectors for both images and text.
  - `backend/app/ml/tagging.py`: Zero-shot campus category & color prediction.
  - `backend/app/ml/scoring.py`: 4-factor scoring engine (visual 35%, text 35%, location 20%, time 10%).
  - Integrated into `POST /items/found`, `POST /items/lost`, and `GET /matches/{lost_id}`.

---

## 3. Important Implementation Decisions & Invariants
- **Do not alter existing database column names or types**: `items` requires `image_embedding vector(512)` and `text_embedding vector(512)`.
- **Status Enum**: Only 4 valid statuses: `lost`, `found`, `matched`, `returned`.
- **Secret Answer Security**: `item_secrets` must NEVER be queryable via frontend clients; only backend with service key accesses it.
- **Privacy First**: Raw photos go to private `originals` bucket; blurred photos go to public `blurred` bucket.

---

## 4. Pending / Next Recommended Tasks
1. **Commit Working Tree**: Commit completed AI Multimodal Embeddings and test suite to branch `feature/saket`.
2. **Admin Endpoints**: Implement `/admin/*` routes (`GET /admin/items`, `POST /admin/items/{id}/status`, `GET /admin/original/{id}`, `GET /admin/stats`).
3. **Notification Engine**: Implement `notifications/notify.py`, `telegram_bot.py`, `email_sender.py`.
4. **Frontend Web App**: Setup Next.js frontend to consume the API.


---

## 5. Files Claude Should Inspect First
1. `docs/api-contract.md`
2. `backend/app/routes/items.py`
3. `backend/app/routes/claims.py`
4. `PROJECT_STATUS.md`
3. `supabase/rls.sql`
4. `PROJECT_STATUS.md`
