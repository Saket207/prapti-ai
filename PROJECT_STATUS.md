# Prapti-AI — Cloud Project Status & Deployment Architecture

Last Updated: 2026-10-21  
Git Branch: `feature/saket`  
Repository: `https://github.com/Saket207/prapti-ai.git`  
Current State: Local Production-Ready • Cloud Staging & Deployment Pending  

---

## 1. Executive Summary & Team Ownership

Prapti-AI is a smart campus lost-and-found system for Dayananda Sagar College of Engineering (DSCE), Bengaluru. It utilizes 512-dimensional CLIP multimodal vector embeddings, OpenCV facial/ID privacy masking, anti-theft secret-challenge claim verification, and single-use cryptographic QR code handovers.

### Team Ownership & Task Allocation Matrix

Reconstructed directly from project evidence (`docs/api-contract.md: line 1`, `CHANGELOG_AI.md: line 210`, and Git commit history):

| Team Member | Original Responsibility | Work Completed | Remaining Work | Dependencies | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Person 1 (Saket - Backend, DB & AI Lead)** | Backend API Suite, Supabase Schema & RLS, CLIP Multimodal Engine, Scoring Algorithm, Privacy Redaction. *(Also completed Frontend Web App, Admin Module & Brevo Notification Engine).* | **100% Complete:** All 8 student endpoints, 4 admin endpoints, OpenCV face/ID redaction, 512-dim CLIP embedder, 4-factor scoring engine with category gating, 2,500-pair benchmark (96.12% accuracy), Next.js 16 frontend, and Brevo transactional email engine. | None for software development. Ready to assist with containerization and cloud integration. | Live Supabase project credentials in `.env` | **P1 (Done)** |
| **Person 3 (Notification & DevOps)** | Originally assigned: Admin API endpoints (`/admin/*`) and notification engine (`notifications/notify.py`). | Admin endpoints and Brevo notification engine were implemented by Person 1 to prevent project blockers. | **Cloud Deployment:**<br>1. Create `backend/Dockerfile` for FastAPI container.<br>2. Deploy backend container to Hugging Face Spaces.<br>3. Populate GitHub Actions (`deploy-ai-service.yml`, `keep-awake.yml`).<br>4. Deploy Next.js frontend to Vercel. | Person 1's completed backend & frontend; Hugging Face / Vercel account credentials. | **P1 (Urgent)** |
| **Person 2 / Teammates (Data, Ethics & Presentation)** | Campus ground-truth evaluation dataset, technical report, ethics analysis, and final presentation slide deck. | Directory scaffolding created (`data/ground_truth.csv`, `data/seed_items.json`, `docs/technical.md`, `docs/privacy-ethics.md`, `docs/presentation/`). | 1. Populate `data/ground_truth.csv` and `data/seed_items.json` with real campus test cases.<br>2. Complete `docs/technical.md` and `docs/privacy-ethics.md`.<br>3. Finalize presentation deck & demo script in `docs/presentation/`. | Person 1's benchmark results & API contract; campus survey data. | **P2** |

---

## 2. Cloud & Hosting Architecture

```
                       ┌─────────────────────────┐
                       │     Student Browser     │
                       │ (Desktop / Mobile Web)  │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   Frontend (Next.js 16) │
                       │    Target: Vercel       │
                       │    Current: localhost   │
                       └────────────┬────────────┘
                                    │ HTTP / REST
                                    ▼
                       ┌─────────────────────────┐
                       │   Backend (FastAPI)     │
                       │ Target: HF Spaces Docker│
                       │    Current: 127.0.0.1   │
                       └─────┬──────────────┬────┘
                             │              │
                PostgreSQL   │              │ SMTP Relay (Port 587)
             + pgvector(512) │              │
                             ▼              ▼
                   ┌──────────────────┐  ┌──────────────────┐
                   │  Supabase Cloud  │  │   Brevo Cloud    │
                   │ Database, Auth,  │  │  Transactional   │
                   │ Storage Buckets  │  │   Email System   │
                   └──────────────────┘  └──────────────────┘
```

---

## 3. Deployment Status by Component

### A. Database, Authentication & Storage (Supabase)
* **Status**: **LIVE & OPERATIONAL** (Connected & Verified)
* **Provider**: Supabase Managed PostgreSQL (`buqivvislqhjqkykuose.supabase.co`)
* **Vector Engine**: `pgvector` extension enabled with HNSW indexes for 512-dimensional embeddings.
* **Storage Buckets**:
  * `originals` (Private): Stores raw photographs; accessible only via backend service-role key or 60-second admin-signed URLs.
  * `blurred` (Public): Stores OpenCV-redacted photographs with faces and campus IDs masked; publicly readable by frontend clients.
* **Row-Level Security (RLS)**: Enforced via `supabase/rls.sql`. Direct mutations from frontend are blocked; all inserts and status changes flow through backend service-role authorization.

### B. Backend AI Service (FastAPI)
* **Status**: **LOCALLY OPERATIONAL • CLOUD DEPLOYMENT PENDING**
* **Local Runtime**: `http://127.0.0.1:8000` (FastAPI with Uvicorn)
* **Target Cloud Host**: Hugging Face Spaces (Docker environment)
* **Current Blocker for Cloud**: No `Dockerfile` exists in `backend/`. Person 3 must containerize the FastAPI app using Python 3.10+ with PyTorch and OpenCV-headless.
* **CI/CD Status**: `.github/workflows/deploy-ai-service.yml` and `.github/workflows/keep-awake.yml` exist as 0-byte skeleton files.

### C. Frontend Web Application (Next.js 16)
* **Status**: **LOCALLY OPERATIONAL • CLOUD DEPLOYMENT PENDING**
* **Local Runtime**: `http://localhost:3000` (Next.js 16 + Tailwind CSS v4)
* **Target Cloud Host**: Vercel
* **Production Build Check**: Verified clean via `npm run build` in `frontend/` (all 6 routes compile to static/optimized pages with 0 errors).
* **Target Cloud Configuration**: Set `NEXT_PUBLIC_API_URL` in Vercel project environment variables pointing to the deployed backend URL.

### D. Transactional Notification Service (Brevo)
* **Status**: **LIVE & VERIFIED**
* **Provider**: Brevo (formerly Sendinblue)
* **Protocol**: SMTP Relay (`smtp-relay.brevo.com:587` with STARTTLS)
* **Deliverability**: Verified delivering live emails to `saketk207@gmail.com`.
* **Templates**: Official Dayananda Sagar College of Engineering (DSCE) reusable responsive HTML template with VML bulletproof buttons for Outlook and mobile clients.

### E. Cloudflare Configuration Status
* **Status**: **NOT CONFIGURED / NOT APPLICABLE**
* **Audit Finding**: A comprehensive search across the entire codebase confirmed that **Cloudflare is not configured in this project**. There are no Cloudflare Workers, Cloudflare Pages, Cloudflare Tunnels (`cloudflared`), or DNS zone files. The project relies on Vercel for frontend hosting and Hugging Face Spaces for backend containerization.

---

## 4. Required Environment Variables & Secrets

Never commit real secrets or `.env` files. The project uses `.env` at the root for backend services and `frontend/.env.local` for the client.

### Backend (`.env` in workspace root):

| Variable Name | Required For | Safe Example Placeholder |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Supabase Client & Storage | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Public Supabase Auth | `your-anon-publishable-key` |
| `SUPABASE_SERVICE_KEY` | Backend Admin Operations & RLS Bypass | `your-service-role-secret-key` |
| `BREVO_API_KEY` | Brevo REST API (v3) | `xkeysib-your-brevo-api-key` |
| `BREVO_SMTP_LOGIN` | Brevo SMTP Relay Username | `your-account-id@smtp-brevo.com` |
| `BREVO_SMTP_PASSWORD` | Brevo SMTP Master Password | `xsmtpsib-your-smtp-key` |
| `SENDER_EMAIL` | Authorized Email Sender | `your-registered-email@gmail.com` |
| `PORT` | FastAPI Server Port (Optional) | `8000` |
| `DEBUG` | FastAPI Debug Mode (Optional) | `True` |

### Frontend (`frontend/.env.local`):

| Variable Name | Required For | Safe Example Placeholder |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend Endpoint Base | `http://localhost:8000` (Dev) / `https://hf.space/your-app` (Prod) |

---

## 5. Startup & Verification Commands

### Local Development Commands:

```bash
# 1. Start Backend Service (Terminal 1)
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Start Frontend Application (Terminal 2)
cd frontend
npm run dev

# 3. Run Automated Backend Test Suites (Terminal 3)
python backend/tests/test_notifications.py
python backend/tests/test_admin.py
python backend/tests/test_ml_and_matching.py

# 4. Verify Next.js Production Build
cd frontend
npm run build
```

---

## 6. Next Steps for Person 3 (DevOps Handover)

1. **Create `backend/Dockerfile`**:
   ```dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   RUN apt-get update && apt-get install -y --no-install-recommends libgl1-mesa-glx libglib2.0-0 && rm -rf /var/lib/apt/lists/*
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY . .
   EXPOSE 7860
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
   ```
2. **Deploy Backend to Hugging Face Spaces**:
   - Create a new Space with Docker SDK.
   - Configure Secret variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `BREVO_SMTP_LOGIN`, `BREVO_SMTP_PASSWORD`, `SENDER_EMAIL`.
3. **Deploy Frontend to Vercel**:
   - Import the GitHub repository (`frontend/` root directory).
   - Set `NEXT_PUBLIC_API_URL` to the Hugging Face Space URL.
4. **Populate GitHub Actions**:
   - Write `.github/workflows/deploy-ai-service.yml` for automated push-to-Spaces.
   - Write `.github/workflows/keep-awake.yml` with a scheduled cron pinging `/health` every 10 minutes to prevent cold starts on free tiers.
