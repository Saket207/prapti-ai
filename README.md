# Prapti-AI 🔎

> Smart Lost & Found for Campus, powered by AI

*Prapti* (प्राप्ति) is Sanskrit for "getting back, obtaining".

## The Problem
Lost items on campus are posted in WhatsApp groups and get buried within minutes. Most never reach their owners.

## Our Solution
Prapti-AI matches lost and found items automatically. When someone reports a found item, the system compares it with all lost reports and alerts the likely owner. No manual searching.

## Key Features
- **Auto-matching** using CLIP image and text embeddings with vector search
- **Privacy blur** for faces and ID numbers in uploaded photos
- **Auto-tagging** of item category and color
- **Claim tracking** (Lost → Found → Matched → Returned) with a history log
- **Secret-detail verification** to prevent false claims
- **Admin dashboard** with hotspot analytics

## Tech Stack
| Layer | Tools |
|---|---|
| Frontend | Next.js, Tailwind CSS, Vercel |
| Backend | FastAPI, Docker, Hugging Face Spaces |
| AI/ML | CLIP, OpenCV/MediaPipe, EasyOCR |
| Database | Supabase (Postgres + pgvector, Auth, Storage) |
| DevOps | GitHub Actions |

## Project Structure
| Folder | Contents |
|---|---|
| `frontend/` | Next.js web app |
| `backend/` | FastAPI service, ML pipeline, Dockerfile |
| `notifications/` | Telegram and email module |
| `supabase/` | SQL schema and migrations |
| `data/` | Ground-truth data and evaluation script |
| `docs/` | API contract, architecture, user guide |

## Team
Dayananda Sagar College of Engineering, Bengaluru
<!-- Add team member names and GitHub links here -->

## Getting Started
<!-- Fill in setup steps as each part is completed -->
