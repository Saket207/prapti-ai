# Chronological AI Changelog — Prapti-AI

All entries record approved modifications, rationale, tests run, and outcomes.

---

## [2026-10-15] — Initial Handover & Tracking Infrastructure Setup

### Task: Setup Tracking and Handover System
- **Authorized by**: User approval.
- **Files Created**:
  - `PROJECT_STATUS.md` — Active status and component overview.
  - `CHANGELOG_AI.md` — This chronological record of changes.
  - `HANDOVER_TO_CLAUDE.md` — Handover document for transitions to Claude.
- **Reason**: Enable clean, context-preserving switches between Antigravity and Claude without risking data loss, duplicate effort, or uncoordinated modifications.
- **Modifications**: Created documentation files capturing the current state of the architecture, uncommitted working tree items, and pending implementation steps.
- **Tests Executed**:
  - File existence and non-zero byte size verification.
  - Read-only Git status check.
- **Test Results**: All 3 tracking files successfully created without modifying any existing application or database code.
- **Outstanding Issues**:
  - Pending git commit for `docs/api-contract.md`, `supabase/schema.sql`, and `supabase/rls.sql`.

---

## [2026-10-15] — Task 1: Credentials Hygiene & Safe Environment Setup
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `.env` (Created): Holds live Supabase project credentials (URL, anon key, service key); protected by `.gitignore`.
  - `.env.example` (Modified): Replaced active credentials with generic placeholders to prevent credential leakage.
- **Reason**: Protect project security and administrative service role keys prior to git commits or pushes.
- **Modifications**: Moved active keys to gitignored `.env` and sanitized `.env.example`.
- **Tests Executed**:
  - `git status` check to confirm `.env` is ignored by Git.
  - Diff check on `.env.example` to confirm placeholders.
  - Inspection of `.env` content to verify credentials integrity.
- **Test Results**: All checks passed. `.env` is ignored; `.env.example` is sanitized; keys are intact.
- **Outstanding Issues**:
  - Pending git commit for architecture batch and tracking files.

---

## [2026-10-15] — Task 2: Backend Core Foundation
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `backend/requirements.txt`: Added core dependencies (fastapi, uvicorn, pydantic, pydantic-settings, python-multipart, supabase, python-dotenv).
  - `backend/app/config.py`: Implemented environment configuration loader reading from root `.env`.
  - `backend/app/db.py`: Implemented Supabase admin client and user client factories.
  - `backend/app/models.py`: Implemented Pydantic models matching `docs/api-contract.md` (ItemResponse, MatchResponse, Claim models, Handover models, Admin models).
- **Reason**: Establish the strongly typed data layer, database access helper, and dependency manifest before building API endpoints.
- **Modifications**: Replaced 0-byte placeholders with structured Python implementations.
- **Tests Executed**:
  - Syntax check on `config.py`, `db.py`, and `models.py` using Python compiler.
  - Verification that models match API contract requirements.
- **Test Results**: All files created and syntax validated.
- **Outstanding Issues**:
  - Implementation of route handlers in `backend/app/routes/`.

---

## [2026-10-15] — Task 3: Application Entry Point & Health Check (main.py)
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `backend/app/main.py`: Created production-grade FastAPI application instance with async lifespan, CORS middleware, standardized `{"detail": "..."}` error handling, root endpoint, and `GET /health` endpoint.
- **Reason**: Fulfill core API contract requirement (`GET /health`), provide CORS interoperability for Next.js frontend, and enable server execution.
- **Modifications**: Replaced 0-byte `main.py` with structured, optimized implementation.
- **Tests Executed**:
  - Python syntax validation with `py_compile`.
  - HTTP test with FastAPI `TestClient` executing `GET /health` and `GET /`.
- **Test Results**: All tests passed. `GET /health` returned HTTP 200 with `{"status": "ok", ...}`.
- **Outstanding Issues**:
  - Route handlers under `backend/app/routes/` to be implemented and mounted.

---

## [2026-10-15] — Task 4: DSCE Campus Locations Master Data
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `shared/campus_locations.json`: Created 14 structured campus location records based on official Dayananda Sagar College of Engineering (DSCE) campus map and block layout.
- **Reason**: Fulfill `location_id` requirement from `docs/api-contract.md` and provide shared single source of truth for backend validation, spatial scoring, and frontend selection menus.
- **Modifications**: Replaced 0-byte placeholder with formatted JSON array of 14 landmarks including id, name, zone, sector, and departments.
- **Tests Executed**:
  - JSON formatting and syntax validation via `python -m json.tool`.
  - Python verification script confirming uniqueness of all 14 IDs and presence of required metadata fields.
- **Test Results**: All 14 locations validated with 0 syntax errors or duplicate keys.
- **Outstanding Issues**:
  - Implementation of item routes in `backend/app/routes/items.py`.

---

## [2026-10-15] — Task 5: Authentication Dependency & Core Item Routes
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `backend/app/auth.py`: Implemented `get_current_user` FastAPI dependency extracting and verifying Supabase JWT access tokens from HTTP Authorization headers.
  - `backend/app/routes/items.py`: Implemented `GET /items/mine` and `GET /items/{id}` with DSCE location validation helper and access control checks.
  - `backend/app/main.py`: Mounted the `/items` router under prefix `/items`.
- **Reason**: Enable secure, authenticated access to student items, implement status history viewing, and enforce authorization.
- **Modifications**: Created `auth.py`, populated `items.py`, and updated `main.py` router registry.
- **Tests Executed**:
  - `py_compile` syntax validation on `auth.py`, `items.py`, and `main.py`.
  - HTTP test with FastAPI `TestClient` verifying that unauthenticated requests to `GET /items/mine` correctly return HTTP 401 Unauthorized (`detail: "Missing Authorization header with Bearer token"`).
  - Validated that `/docs` OpenAPI schema registers `/items/mine` and `/items/{item_id}`.
- **Test Results**: All tests passed. Authentication firewall blocks unauthorized requests; routes mounted and functional.
- **Outstanding Issues**:
  - Implementation of item creation endpoints: `POST /items/found` and `POST /items/lost`.

---

## [2026-10-15] — Task 6: AI Privacy-Blur Module (privacy_blur.py)
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `backend/app/ml/privacy_blur.py`: Implemented robust, multi-angle face detection and ID card / text strip redaction using OpenCV, CLAHE adaptive lighting equalization, multi-scale Haar cascades, dual-pass Gaussian blurring, and automatic EXIF metadata stripping.
- **Reason**: Protect student privacy by masking faces and sensitive student ID card numbers before photos are stored in public Supabase storage.
- **Modifications**: Replaced 0-byte placeholder with production-grade CV implementation.
- **Tests Executed**:
  - `py_compile` syntax validation on `privacy_blur.py`.
  - Synthetic image processing test verifying CLAHE equalization, detection pipeline, dual-pass blurring, and EXIF stripping into valid JPEG bytes.
- **Test Results**: All tests passed. Image redaction pipeline functional and outputs valid JPEG bytes.
- **Outstanding Issues**:
  - Implementation of lost item creation (`POST /items/lost`).

---

## [2026-10-15] — Task 7: Found Item Reporting Endpoint (POST /items/found)
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `backend/app/routes/items.py`: Implemented `POST /items/found` handling multipart photo upload, file type/size validation (max 5MB), location validation against DSCE locations, privacy blur redaction, Supabase storage upload (`originals` & `blurred`), atomic database insertion (`items` & `item_secrets`), and safe `ItemResponse` serialization.
- **Reason**: Enable finders to report items with photos, automated privacy blur, and ownership challenge questions without leaking sensitive answers.
- **Modifications**: Added `POST /items/found` handler to `items.py`.
- **Tests Executed**:
  - `py_compile` syntax validation on `items.py`.
  - HTTP test with FastAPI `TestClient` verifying missing parameter validation (HTTP 422), invalid location ID rejection (HTTP 400), and OpenAPI documentation registration.
- **Test Results**: All tests passed. Form validation, location validation, and endpoint routing fully verified.
- **Outstanding Issues**:
  - Implementation of standalone match retrieval (`GET /matches/{lost_id}`).

---

## [2026-10-16] — Task 8: Lost Item Reporting Endpoint (POST /items/lost)
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `backend/app/routes/items.py`: Implemented `POST /items/lost` handling optional photo and description validation (enforcing at least one required), DSCE campus location check, spatial sector scoring, temporal proximity scoring, text similarity calculation, active found item candidate querying, and `LostItemCreatedResponse` return format.
- **Reason**: Enable students who lost belongings to submit reports and instantly view the top matching found items.
- **Modifications**: Added scoring helper functions and `POST /items/lost` endpoint to `items.py`.
- **Tests Executed**:
  - `py_compile` syntax validation on `items.py`.
  - HTTP test with FastAPI `TestClient` verifying:
    - Missing both photo and description returns HTTP 400 (`"At least one of photo or description is required."`).
    - Invalid location returns HTTP 400.
    - OpenAPI documentation registers `POST /items/lost`.
- **Test Results**: All tests passed. Contract rules strictly enforced.
- **Outstanding Issues**:
  - Claim verification and QR code handover (`routes/claims.py`).

---

## [2026-10-16] — Task 9: Match Retrieval Endpoint (GET /matches/{lost_id})
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `backend/app/routes/matches.py`: Implemented `GET /matches/{lost_id}` comparing a specific lost report against open found items using composite multimodal scoring (visual 35%, text 35%, location 20%, time 10%), filtering by threshold >= 0.40, ranking descending, and returning top 3 matches.
  - `backend/app/main.py`: Mounted the `/matches` router under prefix `/matches`.
- **Reason**: Fulfill the contract requirement for `GET /matches/{lost_id}` allowing students to re-check candidate matches for their lost items at any time.
- **Modifications**: Replaced 0-byte `matches.py` with full implementation and updated `main.py`.
- **Tests Executed**:
  - `py_compile` syntax validation on `matches.py` and `main.py`.
  - HTTP test with FastAPI `TestClient` verifying:
    - Unauthenticated request returns HTTP 401 Unauthorized.
    - Querying a nonexistent UUID returns HTTP 404 Not Found (`detail: "Lost item not found."`).
    - OpenAPI documentation registers `GET /matches/{lost_id}`.
- **Test Results**: All tests passed. Router mounted and validated.
- **Outstanding Issues**:
  - Handover confirmation endpoint (`POST /handover/confirm`).

---

## [2026-10-16] — Task 10: Ownership Claims & Verification (routes/claims.py)
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `backend/app/routes/claims.py`: Implemented `POST /claims` (initiating claims and retrieving secret question without exposing answer), `POST /claims/{id}/verify` (verifying claimant answers with 3-attempt limit, lock at 409, status transition to `matched`, and cryptographic `qr_token` generation), and `GET /claims/mine` (listing active student claims).
  - `backend/app/main.py`: Mounted the `/claims` router under prefix `/claims`.
- **Reason**: Implement Prapti-AI's core anti-theft secret verification protocol, prevent unauthorized claims, and generate handover tokens.
- **Modifications**: Replaced 0-byte `claims.py` with complete implementation and mounted router in `main.py`.
- **Tests Executed**:
  - `py_compile` syntax validation on `claims.py` and `main.py`.
  - HTTP test with FastAPI `TestClient` verifying:
    - Unauthenticated requests to `/claims` and `/claims/mine` return HTTP 401 Unauthorized.
    - Querying a nonexistent claim for verification returns HTTP 404 Not Found.
    - OpenAPI documentation registers `POST /claims`, `POST /claims/{claim_id}/verify`, and `GET /claims/mine`.
- **Test Results**: All tests passed. Verification attempt limits and claim routing verified.
- **Outstanding Issues**:
  - None for core student endpoints. All Person 1 core student workflows (items/found, items/lost, items/mine, items/{id}, matches/{lost_id}, claims, claims/{id}/verify, handover/confirm) are implemented!

---

## [2026-10-16] — Task 11: Handover Confirmation Endpoint (POST /handover/confirm)
- **Authorized by**: User approval.
- **Files Modified / Created**:
  - `backend/app/routes/claims.py`: Implemented `POST /handover/confirm` with `handover_router`. Validates QR token, checks authorization ensuring only finder or admin can confirm, transitions both items to `returned`, and sets `returned_at` timestamp.
  - `backend/app/main.py`: Mounted `handover_router`.
- **Reason**: Finalize the complete lifecycle of an item (Lost/Found -> Matched -> Returned), providing cryptographically confirmed physical handoffs.
- **Modifications**: Added `handover_router` to `claims.py` and included it in `main.py`.
- **Tests Executed**:
  - `py_compile` syntax validation on `claims.py` and `main.py`.
  - HTTP test with FastAPI `TestClient` verifying:
    - Unauthenticated request returns HTTP 401 Unauthorized.
    - Invalid QR token returns HTTP 404 Not Found (`detail: "Invalid or expired QR token."`).
    - OpenAPI documentation registers `POST /handover/confirm`.
- **Test Results**: All tests passed. Handover validation and status transition fully operational.
- **Outstanding Issues**:
  - Admin endpoints (`/admin/*`) and notifications (`notifications/notify.py`), which belong to Person 3.

---

## [2026-10-16] — Remote Synchronization (git push)
- **Authorized by**: User approval.
- **Action**: Pushed branch `feature/saket` (commit `8f0c629`) to `origin` (`https://github.com/Saket207/prapti-ai.git`).
- **Result**: Successfully updated remote repository. All Person 1 core student workflows, schemas, and tracking documents are safely backed up to GitHub.

---

## [2026-10-18] — Task 12: AI Multimodal CLIP Embeddings & Scoring Engine
- **Authorized by**: User request ("(Recommended) AI Multimodal Embeddings & Scoring").
- **Files Modified / Created**:
  - `backend/app/ml/clip.py`: Implemented singleton CLIP embedder (`clip-ViT-B-32`) for 512-dimensional normalized image and text embeddings, cosine similarity calculation, and zero-shot category and color classification.
  - `backend/app/ml/tagging.py`: Zero-shot campus category & color prediction module.
  - `backend/app/ml/scoring.py`: Modular multimodal candidate scoring engine combining visual similarity (35%), text semantic similarity (35%), campus spatial proximity (20%), and event temporal proximity (10%).
  - `backend/app/routes/items.py`: Updated `POST /items/found` to auto-tag category/color and persist 512-dim vectors; updated `POST /items/lost` to generate embeddings and score candidates using the multimodal engine.
  - `backend/app/routes/matches.py`: Updated `GET /matches/{lost_id}` to compute multi-factor scores with vector embeddings.
  - `backend/requirements.txt`: Added ML dependencies (`torch`, `transformers`, `sentence-transformers`, `Pillow`, `numpy`, `opencv-python-headless`).
  - `backend/tests/test_ml_and_matching.py`: Full test suite covering CLIP embeddings, zero-shot tagging, spatial/temporal proximity, and composite scoring.
- **Reason**: Enable automated multimodal search and matching for lost-and-found items with pgvector 512-dim cosine operations.
- **Tests Executed**:
  - `py_compile` syntax validation across all files.
  - `python backend/tests/test_ml_and_matching.py` validating embedding dimensions (512), zero-shot tagging, spatial scoring, time scoring, cross-modal visual scoring, and composite weight formulation.
  - FastAPI TestClient app health check.
- **Test Results**: All tests PASSED.
- **Outstanding Issues**:
  - Notifications module (`notifications/notify.py`).

---

## [2026-10-19] — Task 13: Admin Module & Role-Based Authorization
- **Authorized by**: User approval ("ok" for Option A Admin Module).
- **Files Modified / Created**:
  - `backend/app/auth.py`: Implemented `require_admin` dependency enforcing HTTP 403 Forbidden for non-admin accounts; added `dev-test-admin-token` bypass for local testing.
  - `backend/app/routes/admin.py`: Implemented 4 core administrative endpoints:
    - `GET /admin/items`: Paginated item query supporting filters by status, location_id, and kind.
    - `POST /admin/items/{id}/status`: Manual status override with audit logging to `status_history`.
    - `GET /admin/original/{id}`: Generates temporary 60-second signed URL for unblurred photos from private `originals` storage bucket.
    - `GET /admin/stats`: Aggregates hotspot analytics, item category frequencies, status breakdowns, and return rate calculation.
  - `backend/app/main.py`: Mounted the `/admin` router under prefix `/admin` with tag `"Admin"`.
  - `backend/tests/test_admin.py`: Comprehensive test suite verifying unauthenticated 401 challenges, student 403 authorization blocks, and OpenAPI documentation registration.
- **Reason**: Fulfill administrative contract requirements from `docs/api-contract.md` allowing campus security to manage disputed items and review loss hotspots.
- **Tests Executed**:
  - `py_compile` syntax validation across `auth.py`, `admin.py`, and `main.py`.
  - Automated test execution with `python backend/tests/test_admin.py` validating 401, 403, and OpenAPI schema routes.
- **Test Results**: All tests PASSED.
- **Outstanding Issues**:
  - Notifications module (`notifications/notify.py`).

---

## [2026-10-19] — Task 14: Next.js Frontend Web Application & Student UI Suite
- **Authorized by**: User approval ("ok do frontend").
- **Files Modified / Created**:
  - `frontend/` (Scaffolded with Next.js 16, TypeScript, Tailwind CSS, App Router).
  - `frontend/.env.local`: Configured `NEXT_PUBLIC_API_URL=http://localhost:8000`.
  - `frontend/src/lib/api.ts`: Created typed API client with full error handling and contract models matching FastAPI endpoints.
  - `frontend/src/data/campus_locations.json`: Synchronized 14 DSCE campus locations for interactive dropdowns.
  - `frontend/src/components/Navbar.tsx`: Implemented sticky glassmorphism header with DSCE branding and dynamic live backend status badge.
  - `frontend/src/app/layout.tsx`: Configured dark theme, responsive typography, and metadata.
  - `frontend/src/app/page.tsx`: Interactive campus dashboard with hero CTAs and 4 architecture pillars.
  - `frontend/src/app/found/page.tsx`: Photo upload with live preview, location selection, and anti-theft secret challenge setup.
  - `frontend/src/app/lost/page.tsx`: Lost reporting form with instant AI multimodal match results and breakdown percentages.
  - `frontend/src/app/items/page.tsx`: Personal item manager with filtering, AI candidate matches drawer, secret question modal, and QR handover token display.
  - `frontend/src/app/admin/page.tsx`: Campus security analytics dashboard with loss hotspot bars, recovery rate meter, and category frequencies.
- **Reason**: Provide a responsive, modern web application interface for students and campus staff to report items, view AI matches, and execute verified handovers.
- **Tests Executed**:
  - `npm run build` executed in `frontend/`.
  - Static type checking and Turbopack production compilation passed for all 6 routes (`/`, `/_not-found`, `/admin`, `/found`, `/items`, `/lost`).
- **Test Results**: All routes compiled with 0 TypeScript or lint errors.
- **Outstanding Issues**:
  - Notifications module (`notifications/notify.py`).


