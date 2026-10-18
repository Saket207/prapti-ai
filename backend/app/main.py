import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("prapti-api")

SERVER_START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Executes clean startup checks and graceful shutdown.
    """
    logger.info("Starting Prapti-AI Backend Service...")
    logger.info(f"Environment: {settings.ENVIRONMENT} | Debug: {settings.DEBUG}")
    
    # Verify Supabase URL configuration on boot
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        logger.warning("Supabase credentials missing or incomplete in settings!")
    else:
        logger.info("Supabase credentials configured successfully.")

    yield  # Application is serving requests

    logger.info("Shutting down Prapti-AI Backend Service cleanly...")


# =====================================================================
# FastAPI Application Initialization
# =====================================================================
app = FastAPI(
    title="Prapti-AI API",
    description=(
        "Smart Lost & Found backend for campus, powered by AI.\n\n"
        "Features automated multimodal matching (CLIP), privacy-preserving face/ID blurring, "
        "secret-question verification, and QR handover workflows."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# =====================================================================
# High-Performance CORS Configuration
# =====================================================================
# Allows the Next.js frontend (local dev and Vercel deployments) to access the API
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,  # Cache pre-flight OPTIONS requests for 10 minutes
)


# =====================================================================
# Standardized Error Handlers (Enforcing docs/api-contract.md)
# All errors must strictly return {"detail": "message"}
# =====================================================================
@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Extract the first human-readable validation error
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    loc = " -> ".join(str(l) for l in first_error.get("loc", []))
    msg = first_error.get("msg", "Invalid request parameter")
    error_detail = f"Validation error at '{loc}': {msg}" if loc else msg

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": error_detail},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error at {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


# =====================================================================
# Core Baseline Endpoints
# =====================================================================
@app.get(
    "/health",
    summary="Health check",
    tags=["System"],
    response_model=Dict[str, Any],
)
async def health_check() -> Dict[str, Any]:
    """
    Health-check probe used by monitoring, keep-awake jobs, and load balancers.
    Complies with docs/api-contract.md: returns `{"status": "ok"}`.
    """
    uptime_seconds = int(time.time() - SERVER_START_TIME)
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": uptime_seconds,
    }


@app.get(
    "/",
    summary="Service Root",
    tags=["System"],
    include_in_schema=False,
)
async def root():
    """
    Friendly root endpoint with pointers to interactive API documentation.
    """
    return {
        "project": "Prapti-AI API",
        "tagline": "Smart Lost & Found for Campus, powered by AI",
        "status": "healthy",
        "documentation": "/docs",
        "health": "/health",
    }


# =====================================================================
# Router Inclusions
# =====================================================================
from app.routes.items import router as items_router
from app.routes.matches import router as matches_router
from app.routes.claims import router as claims_router, handover_router
from app.routes.admin import router as admin_router

app.include_router(items_router, prefix="/items", tags=["Items"])
app.include_router(matches_router, prefix="/matches", tags=["Matches"])
app.include_router(claims_router, prefix="/claims", tags=["Claims"])
app.include_router(handover_router, tags=["Handover"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])

