# Prapti-AI 🔎

> **Smart Campus Lost & Found System, powered by Multimodal AI & Privacy Redaction**  
> *Developed for Dayananda Sagar College of Engineering (DSCE), Bengaluru*  
> *Prapti* (प्राप्ति) is Sanskrit for *"getting back, obtaining, recovery"*.

---

![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![PyTorch](https://img.shields.io/badge/AI_Engine-PyTorch_&_CLIP-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![OpenCV](https://img.shields.io/badge/Computer_Vision-OpenCV_Privacy_Blur-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)
![Supabase](https://img.shields.io/badge/Database-Supabase_pgvector-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Brevo](https://img.shields.io/badge/Notifications-Brevo_SMTP-0B996F?style=for-the-badge&logo=mailgun&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/UI_Styling-Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

---

## Table of Contents
- [1. Problem Statement & Objectives](#1-problem-statement--objectives)
- [2. System Architecture](#2-system-architecture)
- [3. Feature Matrix (Completed vs Planned)](#3-feature-matrix-completed-vs-planned)
- [4. Technology Stack](#4-technology-stack)
- [5. Repository Structure](#5-repository-structure)
- [6. Setup Prerequisites](#6-setup-prerequisites)
- [7. Fresh Clone Installation & Setup](#7-fresh-clone-installation--setup)
- [8. Running the Backend Service](#8-running-the-backend-service)
- [9. Running the Frontend Application](#9-running-the-frontend-application)
- [10. Database Architecture & Storage Vault](#10-database-architecture--storage-vault)
- [11. Multimodal AI & Privacy Pipeline](#11-multimodal-ai--privacy-pipeline)
- [12. Cloud Deployment & Cloudflare Status](#12-cloud-deployment--cloudflare-status)
- [13. Verified API Contract & Examples](#13-verified-api-contract--examples)
- [14. Testing & Verification Suite](#14-testing--verification-suite)
- [15. Troubleshooting & Common Pitfalls](#15-troubleshooting--common-pitfalls)
- [16. Team Responsibilities & Handover Matrix](#16-team-responsibilities--handover-matrix)
- [17. Developer Handover Instructions](#17-developer-handover-instructions)
- [18. Credits & Acknowledgements](#18-credits--acknowledgements)

---

## 1. Problem Statement & Objectives

### The Problem
On university campuses like **Dayananda Sagar College of Engineering (DSCE)** with thousands of daily students across multiple engineering blocks, libraries, and food courts, lost belongings (wallets, keys, ID cards, phones, headphones) are typically reported on informal WhatsApp groups or student Discord channels. 

These posts get buried in minutes, have no standardized location metadata, expose students' personal identity or sensitive ID cards to the entire campus, and suffer from high rates of false ownership claims.

### Our Solution
Prapti-AI replaces chaotic chat groups with an automated, privacy-first campus recovery portal:
1. **Automated Multimodal Matching**: Translates photos and descriptions into 512-dimensional vector embeddings using OpenAI's CLIP architecture (`clip-ViT-B-32`) to detect matches regardless of phrasing.
2. **Automated Facial & ID Card Redaction**: OpenCV with CLAHE adaptive equalization automatically detects faces and student ID numbers, blurring them heavily before images are saved to public cloud storage.
3. **Anti-Theft Secret Challenge**: A finder sets a secret question (e.g., *"What is written on the inner keychain tag?"*). Claimants must correctly answer the question (maximum 3 attempts) before claiming.
4. **Single-Use Cryptographic Handover**: Verified claims issue a cryptographic QR token (`prapti_...`) that the finder scans in person to confirm exchange and close the record.
5. **Real-Time Institutional Notifications**: Event-driven emails sent via Brevo deliver match alerts and handover passes directly to students' inboxes.

---

## 2. System Architecture

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Next.js 16 + Tailwind CSS)"]
        A1["Student Portal (/lost, /found)"]
        A2["Belongings Manager (/items)"]
        A3["Admin Security Dashboard (/admin)"]
    end

    subgraph APILayer ["FastAPI Backend (Port 8000)"]
        B1["Items Router (/items)"]
        B2["Matches Router (/matches)"]
        B3["Claims Router (/claims)"]
        B4["Admin Router (/admin)"]
        B5["Auth Guard & RBAC (JWT)"]
    end

    subgraph AIEngine ["Multimodal AI & Vision Pipeline"]
        C1["OpenCV Privacy Blur (Faces & ID Strips)"]
        C2["CLIP Embedder (512-dim Image & Text)"]
        C3["Zero-Shot Tagging (Category & Color)"]
        C4["4-Factor Scoring Engine + Category Gating"]
    end

    subgraph DataCloud ["Supabase Managed Cloud"]
        D1[("PostgreSQL with pgvector (512-dim)")]
        D2["Private Storage Bucket ('originals')"]
        D3["Public Storage Bucket ('blurred')"]
        D4["Row-Level Security (RLS) Engine"]
    end

    subgraph NotificationLayer ["Brevo Notification Service"]
        E1["SMTP Relay (smtp-relay.brevo.com:587)"]
        E2["Official DSCE College HTML Template"]
    end

    A1 -->|REST API Requests| B1
    A2 -->|Query Matches & Claims| B2
    A2 -->|Submit Secret Answers| B3
    A3 -->|Manage Disputed Items & Hotspots| B4
    B1 & B2 & B3 & B4 --> B5

    B1 -->|Raw Image Upload| C1
    C1 -->|Blurred Photo| D3
    C1 -->|Raw Photo| D2
    B1 -->|Generate Embeddings| C2
    C2 --> C3
    B1 & B2 -->|Score Candidates| C4
    C4 -->|Read Vectors & Compute Cosine| D1

    B1 & B3 -->|Lifecycle Events (match_found, handover_ready)| E1
    E1 --> E2
```

---

## 3. Feature Matrix (Completed vs Planned)

### ✅ Completed & Fully Verified Features
* **Multipart Found Item Reporting (`POST /items/found`)**: Full upload pipeline with OpenCV privacy masking, dual-bucket storage, CLIP embeddings, and secret challenge creation.
* **Lost Item Reporting with Instant Scoring (`POST /items/lost`)**: Instant candidate matching using 4-factor scoring (visual 35%, text 35%, location 20%, time 10%).
* **Anti-Theft Secret Verification (`POST /claims/{id}/verify`)**: 3-attempt brute-force protection with permanent lockouts.
* **Single-Use Handover Pass (`POST /handover/confirm`)**: Cryptographic QR token generation and authorization-verified status transitions to `returned`.
* **Campus Admin Module (`backend/app/routes/admin.py`)**: Hotspot spatial analytics, category breakdowns, manual status overrides with audit notes, and 60-second temporary signed URLs for private photos.
* **Empirical AI Benchmarking (`backend/tests/benchmark_accuracy.py`)**: 2,500 pairwise tests demonstrating **96.12% accuracy**, **98.00% recall**, and **96.08% specificity**.
* **Modern Next.js 16 Web Application (`frontend/`)**: Responsive dark glassmorphism interface across all 5 portals (`/`, `/lost`, `/found`, `/items`, `/admin`).
* **Brevo Transactional Email Engine (`notifications/`)**: Real-time institutional alerts using the official DSCE base template with bulletproof Outlook/mobile VML buttons.

### ⏳ Planned Features (Handover to Teammates)
* **Cloud Containerization & Hosting (Person 3)**: Dockerfile containerization of FastAPI backend for Hugging Face Spaces, and deployment of Next.js frontend to Vercel.
* **GitHub Actions CI/CD (Person 3)**: Automated deploy workflow (`deploy-ai-service.yml`) and keep-awake pinger (`keep-awake.yml`).
* **Campus Ground-Truth Dataset (Person 2)**: Collection of 50+ real lost/found incidents in `data/ground_truth.csv` and `data/seed_items.json`.
* **Technical Paper & Ethics Analysis (Person 2)**: Final writeups in `docs/technical.md` and `docs/privacy-ethics.md`.

---

## 4. Technology Stack

| Layer | Technology | Version | Purpose in Prapti-AI |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) | `16.4.2` | Server and client UI components with Turbopack compilation |
| **UI Library** | React | `19.3.0` | Declarative UI state management and interactive modals |
| **CSS & Styling** | Tailwind CSS | `v4.0` | Custom dark-mode glassmorphic theme with DSCE brand colors |
| **Backend Framework**| FastAPI | `0.115.0+` | Asynchronous REST API service with auto-generated Swagger OpenAPI |
| **ASGI Server** | Uvicorn | `0.32.0+` | High-performance asynchronous HTTP server |
| **Multimodal AI** | `sentence-transformers` | `3.0.0+` | Singleton `clip-ViT-B-32` model generating 512-dim vectors |
| **Computer Vision** | OpenCV Headless | `4.8.0+` | CLAHE histogram equalization, face detection, and ID card redaction |
| **Database & Auth** | Supabase | `2.10.0+` | Managed PostgreSQL, `pgvector(512)`, RLS, and secure image buckets |
| **Email Service** | Brevo SMTP Relay | Port `587` | Transactional email delivery with official college HTML templates |

---

## 5. Repository Structure

```text
Prapti-ai/
├── .env                       # Local secrets (gitignored; Supabase & Brevo credentials)
├── .env.example               # Sanitized template with safe dummy placeholders
├── CHANGELOG_AI.md            # App Update & chronological task audit log
├── HANDOVER_TO_CLAUDE.md      # Catalogue AI Handover & ML pipeline guide
├── PROJECT_STATUS.md          # Cloud Project Status & deployment architecture
├── README.md                  # This main developer & project guide
│
├── backend/                   # FastAPI backend service
│   ├── app/
│   │   ├── auth.py            # Supabase JWT validator & require_admin guard
│   │   ├── config.py          # Pydantic Settings configuration loader
│   │   ├── db.py              # Supabase admin client & build_blurred_public_url
│   │   ├── main.py            # FastAPI entry point, CORS, lifespan, router mounts
│   │   ├── models.py          # Strongly-typed Pydantic request/response schemas
│   │   ├── ml/
│   │   │   ├── clip.py        # Singleton CLIP 512-dim embedder & zero-shot classifier
│   │   │   ├── privacy_blur.py# OpenCV face & ID card Gaussian redaction
│   │   │   └── scoring.py     # 4-factor scoring engine with category gating
│   │   └── routes/
│   │       ├── admin.py       # Hotspot analytics, status overrides, 60s signed vault URLs
│   │       ├── claims.py      # Secret verification & physical handover confirmation
│   │       ├── items.py       # Lost & found reporting endpoints
│   │       └── matches.py     # Candidate match retrieval endpoint
│   ├── requirements.txt       # Python dependencies manifest
│   └── tests/
│       ├── benchmark_accuracy.py  # 2,500-pair empirical AI accuracy test harness
│       ├── test_admin.py          # Admin endpoints and RBAC security tests
│       ├── test_ml_and_matching.py# Multimodal CLIP and scoring unit tests
│       └── test_notifications.py  # Brevo email notification unit tests
│
├── frontend/                  # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/page.tsx # Campus Security Analytics dashboard
│   │   │   ├── found/page.tsx # Report found item with live image preview & secret setup
│   │   │   ├── items/page.tsx # My belongings management, match drawer & QR handover
│   │   │   ├── lost/page.tsx  # Report lost item with instant AI match breakdown
│   │   │   ├── layout.tsx     # Root HTML layout with DSCE branding & dark theme
│   │   │   ├── page.tsx       # Landing page with hero CTAs and architecture pillars
│   │   │   └── globals.css    # Tailwind CSS v4 styling & color definitions
│   │   ├── components/
│   │   │   ├── ImageUpload.tsx# Drag-and-drop file upload with preview
│   │   │   ├── MatchCard.tsx  # AI candidate display with percentage score bars
│   │   │   ├── Modal.tsx      # Accessible popups for verification & photo inspection
│   │   │   └── Navbar.tsx     # Glassmorphic header with live backend status badge
│   │   ├── data/
│   │   │   └── campus_locations.json # Frontend copy for bundling
│   │   └── lib/
│   │       └── api.ts         # Strongly-typed API client matching backend models
│   ├── package.json           # Frontend dependencies manifest
│   └── tsconfig.json          # TypeScript compiler configuration
│
├── notifications/             # Notification subsystem
│   ├── email_sender.py        # Brevo SMTP relay & REST API dispatcher with fallback
│   └── notify.py              # Central notification router with official DSCE HTML template
│
├── shared/
│   └── campus_locations.json  # 14 authentic Dayananda Sagar College of Engineering locations
│
├── supabase/
│   ├── schema.sql             # 5 tables, pgvector(512), triggers, and storage buckets
│   └── rls.sql                # Row-Level Security policies restricting frontend mutations
│
├── data/                      # Evaluation datasets (Person 2 Handover)
│   ├── ground_truth.csv       # Campus benchmark dataset placeholder
│   └── seed_items.json        # Demo seed items placeholder
│
└── docs/                      # Technical reports & presentation (Person 2 Handover)
    ├── api-contract.md        # Frozen API Contract specification (owner: Person 1)
    ├── privacy-ethics.md      # Ethics and privacy paper placeholder
    ├── technical.md           # Architecture paper placeholder
    └── presentation/          # Pitch deck & slides directory
```

---

## 6. Setup Prerequisites

Before running the application on a new machine, ensure you have:
* **Operating System**: Windows 10/11, macOS, or Linux.
* **Python**: Version `3.10` or higher (tested on Python `3.11` and `3.13`).
* **Node.js**: Version `18.x` or higher (tested on Node `v22`).
* **Git**: Installed and configured on your machine.
* **Hardware**: Standard x86 or ARM CPU. A GPU is **not** required; CLIP inference runs efficiently on CPU (~18ms per pair).

---

## 7. Fresh Clone Installation & Setup

Open your terminal and clone the repository:

```bash
# 1. Clone repository
git clone https://github.com/Saket207/prapti-ai.git
cd prapti-ai

# 2. Switch to active development branch
git checkout feature/saket
```

### Environment Configuration (`.env`)
Create a `.env` file in the project root directory by copying the template:

```bash
cp .env.example .env
```

Open `.env` in your text editor and fill in the required credentials:

```env
# 1. Supabase Project Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-publishable-key
SUPABASE_SERVICE_KEY=your-service-role-secret-key

# 2. Brevo Email Notification Credentials (Free plan)
BREVO_API_KEY=xkeysib-your-brevo-api-key
BREVO_SMTP_LOGIN=your-account-id@smtp-brevo.com
BREVO_SMTP_PASSWORD=xsmtpsib-your-smtp-key
SENDER_EMAIL=your-verified-email@gmail.com

# 3. Environment Flags
ENVIRONMENT=development
DEBUG=True
PORT=8000
```

> **Security Invariant**: Never commit `.env` to Git. It is explicitly ignored in `.gitignore`.

---

## 8. Running the Backend Service

Open a new terminal window:

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a virtual environment (optional but recommended)
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS / Linux:
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Start the FastAPI server with auto-reload
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

* **Health Check Endpoint**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
* **Interactive Swagger API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 9. Running the Frontend Application

Open a second terminal window:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Create frontend local environment file
echo NEXT_PUBLIC_API_URL=http://localhost:8000 > .env.local

# 4. Start the development server
npm run dev
```

* **Web Application Portal**: [http://localhost:3000](http://localhost:3000)
* **Report Lost Item**: [http://localhost:3000/lost](http://localhost:3000/lost)
* **Report Found Item**: [http://localhost:3000/found](http://localhost:3000/found)
* **My Belongings & Claims**: [http://localhost:3000/items](http://localhost:3000/items)
* **Campus Security Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 10. Database Architecture & Storage Vault

The database is built on PostgreSQL inside Supabase, featuring 5 core tables and 2 distinct storage buckets defined in `supabase/schema.sql`:

1. **`profiles`**: Stores registered students, role (`student` or `admin`), and email address.
2. **`items`**: Stores lost reports and found reports with location metadata, category, color, and `vector(512)` embeddings for text and images.
3. **`item_secrets`**: Anti-theft secret question and answer set by finders. Row-Level Security prevents students from ever querying this table directly.
4. **`claims`**: Manages verification attempts, attempt counter (lockout at 3), cryptographic QR handover token (`qr_token`), and status timestamps.
5. **`status_history`**: Audit trail logging every lifecycle status change (`lost` → `found` → `matched` → `returned`).

### Dual-Bucket Image Security
* **`originals` (Private Bucket)**: Stores original raw photographs. Non-accessible via public URLs. Only campus security administrators can request 60-second signed URLs (`GET /admin/original/{id}`).
* **`blurred` (Public Bucket)**: Stores OpenCV-redacted photographs with faces and student ID numbers blurred. Publicly accessible by student browsers.

---

## 11. Multimodal AI & Privacy Pipeline

### 4-Factor Composite Candidate Scoring Formula
When a lost item is reported, open found reports are ranked using a multi-factor scoring formula:

$$\text{Composite Score} = (0.35 \times S_{\text{visual}}) + (0.35 \times S_{\text{text}}) + (0.20 \times S_{\text{location}}) + (0.10 \times S_{\text{time}})$$

1. **Visual Score ($S_{\text{visual}}$)**: Cosine similarity between CLIP image embeddings (or cross-modal text-to-image similarity if the lost report is text-only).
2. **Text Score ($S_{\text{text}}$)**: Cosine similarity between CLIP text embeddings of descriptions, adjusted with keyword grounding.
3. **Location Score ($S_{\text{location}}$)**: Spatial proximity based on the 14 campus zones in `shared/campus_locations.json`. Same location = $1.0$; same campus zone = $0.70$; different zone = $0.30$.
4. **Time Score ($S_{\text{time}}$)**: Exponential decay based on elapsed hours between reports:
   $$S_{\text{time}} = \exp\left(-\frac{\Delta t}{72}\right)$$
5. **Category Compatibility Gating**: Strictly prevents false matches across incompatible categories (e.g. an umbrella will never match a phone, even with high textual similarity).

---

## 12. Cloud Deployment & Cloudflare Status

### Verification Finding on Cloudflare
A complete search of this repository confirms that **Cloudflare is NOT configured in this project**. There are no Cloudflare Workers, Pages, Tunnels, or DNS configurations.

### Target Cloud Hosting Architecture (Handover to Person 3)
1. **Backend Service**: Target is **Hugging Face Spaces** (Docker SDK).
2. **Frontend Application**: Target is **Vercel** (`frontend/` root directory).
3. **Database & Storage**: Already live on **Supabase Managed Cloud**.
4. **Notifications**: Already live on **Brevo SMTP Cloud**.

---

## 13. Verified API Contract & Examples

### `POST /items/found` (Report Found Item)
* **Content-Type**: `multipart/form-data`
* **Form Fields**: `photo` (File), `location_id` (String), `secret_question` (String), `secret_answer` (String), `description` (Optional String), `event_time` (Optional ISO String).
* **Sample Response (HTTP 201)**:
```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "kind": "found",
  "status": "found",
  "description": "Black leather wallet found near study desk",
  "category": "wallet",
  "color": "black",
  "location_id": "central_library",
  "event_time": "2026-10-21T02:00:00Z",
  "blurred_image_url": "https://your-project.supabase.co/storage/v1/object/public/blurred/7c9e.../blurred.jpg",
  "created_at": "2026-10-21T02:05:00Z"
}
```

### `POST /claims/{id}/verify` (Answer Secret Question)
* **Request Body**: `{"answer": "Tommy Hilfiger with blue card"}`
* **Success Response (HTTP 200)**:
```json
{
  "verified": true,
  "qr_token": "prapti_xK9mZ8Lq2NvP4RtW0Y1U3sA7",
  "attempts_left": null
}
```
* **Failure Response (HTTP 200)**:
```json
{
  "verified": false,
  "qr_token": null,
  "attempts_left": 2
}
```
*(After 3 incorrect attempts, returns `HTTP 409 Conflict: Claim locked`).*

### `POST /handover/confirm` (Complete Exchange)
* **Request Body**: `{"qr_token": "prapti_xK9mZ8Lq2NvP4RtW0Y1U3sA7"}`
* **Response (HTTP 200)**: `{"status": "returned"}`

---

## 14. Testing & Verification Suite

All test suites can be executed from the project root:

```bash
# 1. Test Brevo Real-Time Notification Engine
python backend/tests/test_notifications.py

# 2. Test Admin Module & Role-Based Access Control
python backend/tests/test_admin.py

# 3. Test Multimodal CLIP Embeddings & Scoring Formula
python backend/tests/test_ml_and_matching.py

# 4. Run the 2,500-Pair AI Accuracy Benchmark
python backend/tests/benchmark_accuracy.py

# 5. Verify Next.js Production Build
cd frontend
npm run build
```

---

## 15. Troubleshooting & Common Pitfalls

1. **`Brevo (525, b'5.7.1 Unauthorized IP address')`**:
   * **Cause**: Brevo has an IP whitelist security rule active on new accounts.
   * **Fix**: Go to Brevo Dashboard → **Settings** → **Security** → **Authorized IP addresses** (`https://app.brevo.com/settings/security/ip-whitelist`) and click **Deactivate for SMTP keys** or add your public IP.
2. **`ModuleNotFoundError: No module named 'notifications'`**:
   * **Cause**: Running backend scripts directly without the workspace root on `sys.path`.
   * **Fix**: The workspace root is dynamically included in `backend/app/config.py`. Always execute commands from the repository root directory.
3. **Images Not Loading in Frontend**:
   * **Cause**: Supabase storage domains must be whitelisted in Next.js image configuration.
   * **Fix**: Verified already in `frontend/next.config.ts` under `images.remotePatterns` for `*.supabase.co`.

---

## 16. Team Responsibilities & Handover Matrix

| Team Member | Original Assignment | Work Completed | Remaining Work | Dependencies | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Person 1 (Saket - Lead)** | Backend API suite, Supabase schema & RLS, CLIP multimodal engine, scoring algorithm, privacy redaction. *(Also completed Frontend UI, Admin APIs & Brevo Notifications).* | **100% Complete:** All 8 student endpoints, 4 admin endpoints, OpenCV privacy blur, CLIP embedder, 4-factor scoring, 2,500-pair benchmark, Next.js 16 frontend, and Brevo notification engine. | None for software development. Ready to assist with containerization. | Live Supabase project credentials in `.env` | **P1 (Done)** |
| **Person 3 (DevOps & Deploy)** | Originally assigned: Admin API endpoints and notification engine. | Admin endpoints and Brevo notification engine were implemented by Person 1 to avoid blockers. | **Cloud Deployment:**<br>1. Create `backend/Dockerfile`.<br>2. Deploy backend to Hugging Face Spaces.<br>3. Populate GitHub Actions (`deploy-ai-service.yml`, `keep-awake.yml`).<br>4. Deploy frontend to Vercel. | Person 1's completed backend & frontend; Hugging Face / Vercel credentials. | **P1 (Urgent)** |
| **Person 2 / Teammates (Data & Docs)** | Campus ground-truth evaluation dataset, technical report, ethics analysis, and presentation pitch deck. | Directory scaffolding created (`data/ground_truth.csv`, `data/seed_items.json`, `docs/technical.md`, `docs/privacy-ethics.md`, `docs/presentation/`). | 1. Populate `data/ground_truth.csv` and `data/seed_items.json` with authentic campus cases.<br>2. Complete `docs/technical.md` and `docs/privacy-ethics.md`.<br>3. Finalize presentation deck & demo script in `docs/presentation/`. | Person 1's benchmark results & API contract; campus survey data. | **P2** |

---

## 17. Developer Handover Instructions

If you are picking up this project on a fresh machine:
1. **Clone & Checkout**: Clone the repo and switch to `feature/saket`.
2. **Environment Variables**: Copy `.env.example` to `.env` and fill in the Supabase and Brevo credentials.
3. **Backend Setup**: In `backend/`, install `requirements.txt` and run `python -m uvicorn app.main:app --port 8000 --reload`.
4. **Frontend Setup**: In `frontend/`, run `npm install` and `npm run dev`.
5. **Run Verification**: Run `python backend/tests/test_notifications.py` and `npm run build` in `frontend/`.
6. **Pick Up Your Assigned Tasks**:
   * If you are **Person 3**: Follow the instructions in Section 6 of [`PROJECT_STATUS.md`](file:///c:/Users/asus/OneDrive/Desktop/Prapti-ai/PROJECT_STATUS.md) to containerize the backend and deploy to Hugging Face Spaces and Vercel.
   * If you are **Person 2**: Populate `data/ground_truth.csv` and complete the presentation deck in `docs/presentation/`.

---

## 18. Credits & Acknowledgements

* **Department**: Dayananda Sagar College of Engineering (DSCE), Bengaluru
* **Lead Engineer**: Saket Kumar (Backend, Multimodal AI, Database, Frontend & Notifications)
* **Core Technologies**: OpenAI CLIP, FastAPI, Next.js, Supabase, OpenCV, Brevo
