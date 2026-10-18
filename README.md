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

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.13)
- **Node.js**: v18+ (tested on Node v22)
- **Git**

---

### 1. Backend Setup & Run (FastAPI + AI Engine)

Open a terminal and navigate to the `backend/` directory:

```bash
# Navigate to backend
cd backend

# Install Python dependencies
pip install -r requirements.txt
# or install core packages directly:
pip install fastapi uvicorn supabase python-multipart sentence-transformers torch torchvision opencv-python Pillow numpy pydantic-settings python-dotenv requests

# Start the FastAPI backend with auto-reload
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. Frontend Setup & Run (Next.js 16 + Tailwind CSS)

Open a second terminal and navigate to the `frontend/` directory:

```bash
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```

- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **Found Item Portal**: [http://localhost:3000/found](http://localhost:3000/found)
- **Lost Item Portal**: [http://localhost:3000/lost](http://localhost:3000/lost)
- **My Items Management**: [http://localhost:3000/items](http://localhost:3000/items)
- **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

### Quick Dev Reference

| Component | Working Directory | Command | URL |
| :--- | :--- | :--- | :--- |
| **Backend** | `Prapti-ai/backend` | `python -m uvicorn app.main:app --port 8000 --reload` | `http://127.0.0.1:8000` |
| **Frontend** | `Prapti-ai/frontend` | `npm run dev` | `http://localhost:3000` |
