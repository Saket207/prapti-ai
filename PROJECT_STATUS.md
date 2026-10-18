# Prapti-AI — Project Status

Last Updated: 2026-10-15
Current Git Branch: `feature/saket`
Current Phase: Foundation & Backend Implementation

---

## 1. Project Purpose & Scope
Prapti-AI (*Prapti* = Sanskrit for "getting back, obtaining") is an AI-powered lost-and-found system for university campuses (originating at Dayananda Sagar College of Engineering, Bengaluru). It solves the problem of campus lost items getting buried in noisy messaging groups by providing automated multimodal matching, privacy-preserving face/ID blurring, secret-question claim verification, and QR-code handover confirmation.

---

## 2. Component Status

| Component | Status | Details |
| :--- | :--- | :--- |
| **Database Schema** | Specification Complete | `supabase/schema.sql` defines 5 tables (`profiles`, `items`, `item_secrets`, `claims`, `status_history`), `pgvector` HNSW indexes, triggers, and storage buckets. |
| **Security & RLS** | Specification Complete | `supabase/rls.sql` revokes direct mutations from frontend; enforces backend service-role operations for integrity. |
| **API Contract** | Specification Complete | `docs/api-contract.md` specifies all student, admin, and notification endpoints. |
| **Backend Core** | Implemented & Verified | `main.py`, `config.py`, `db.py`, `models.py` operational with CORS, error handlers, and `/health`. |
| **AI/ML Modules** | Implemented & Verified | `privacy_blur.py`, `clip.py` (512-dim multimodal embeddings), `tagging.py` (zero-shot classification), and `scoring.py` (composite ranking engine) fully verified. |
| **Student Routes** | Implemented & Verified | All Person 1 student endpoints (`items`, `matches`, `claims`, `handover`) fully implemented & verified. |
| **Auth & Security** | Implemented & Verified | `backend/app/auth.py` verifying Supabase JWTs with HTTP 401 challenge. |
| **Campus Data** | Implemented & Verified | `shared/campus_locations.json` populated with 14 authentic DSCE campus locations and zones. |
| **Notifications** | Pending Implementation | `notifications/notify.py`, `telegram_bot.py`, `email_sender.py` are skeleton files. |
| **Frontend Web App** | Pending Implementation | Next.js application directory not yet initialized. |

---

## 3. Working Features (Verified)
- **Database Architecture**: Comprehensive PostgreSQL schema with pgvector (512-dim) support.
- **Access Control Model**: Documented RLS policies ensuring non-leaking secret questions/answers and safe image bucket permissions.
- **REST & Event Specification**: Complete request/response contracts for students, admins, and notification webhooks.

---

- **Uncommitted Architecture Files**: `docs/api-contract.md`, `supabase/schema.sql`, `supabase/rls.sql`, and tracking files reside in the working directory and need to be committed.
- **Credentials Hygiene**: Completed. Live Supabase credentials are secure in gitignored `.env`; `.env.example` contains sanitized placeholders.
