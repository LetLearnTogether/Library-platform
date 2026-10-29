import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import event
from sqlalchemy.engine import Engine
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    APP_ENV,
    CORS_ORIGINS,
    DATABASE_URL,
    PUBLIC_API_BASE_URL,
    PUBLIC_FRONTEND_URL,
    SECRET_KEY,
    UPLOAD_DIR_CONFIGURED,
    UPLOAD_DIR,
)
from app.core.database import engine
import app.models
from app.routers import auth, courses, documents, quizzes, reports, users, verification

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("letlearntogether.api")


@event.listens_for(Engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
    if dbapi_connection.__class__.__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if APP_ENV == "production":
        if len(SECRET_KEY) < 32 or "change" in SECRET_KEY.lower() or "replace" in SECRET_KEY.lower():
            raise RuntimeError("Production requires a strong SECRET_KEY of at least 32 characters.")
        if not DATABASE_URL.startswith("mysql"):
            raise RuntimeError("Production requires a MySQL DATABASE_URL.")
        if not PUBLIC_API_BASE_URL.startswith("https://"):
            raise RuntimeError("Production PUBLIC_API_BASE_URL must use HTTPS.")
        if not PUBLIC_FRONTEND_URL.startswith("https://"):
            raise RuntimeError("Production PUBLIC_FRONTEND_URL must use HTTPS.")
        if ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
            raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES must be positive.")
        if not CORS_ORIGINS or "*" in CORS_ORIGINS:
            raise RuntimeError("Production must configure explicit CORS_ORIGINS.")
        if not UPLOAD_DIR_CONFIGURED:
            raise RuntimeError("Production must configure persistent document storage with UPLOAD_DIR.")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="LetLearnTogether API",
    version="1.0.0",
    description="Student library, document verification, moderation, and quiz API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    request.state.request_id = f"req_{uuid.uuid4().hex}"
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response


def error_response(request: Request, code: str, message: str, status_code: int, headers: dict | None = None):
    return JSONResponse(
        status_code=status_code,
        content={
            "error_code": code,
            "message": message,
            "request_id": getattr(request.state, "request_id", f"req_{uuid.uuid4().hex}"),
        },
        headers=headers,
    )


@app.exception_handler(StarletteHTTPException)
async def handle_http_error(request: Request, exc: StarletteHTTPException):
    codes = {
        400: "BAD_REQUEST",
        401: "AUTH_REQUIRED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        413: "PAYLOAD_TOO_LARGE",
        415: "UNSUPPORTED_MEDIA_TYPE",
        422: "VALIDATION_ERROR",
    }
    message = exc.detail if isinstance(exc.detail, str) else "The request could not be completed."
    return error_response(request, codes.get(exc.status_code, "API_ERROR"), message, exc.status_code, exc.headers)


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, _exc: RequestValidationError):
    return error_response(request, "VALIDATION_ERROR", "Request data failed validation.", 422)


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception):
    logger.exception("Unhandled request error (request_id=%s)", getattr(request.state, "request_id", "unknown"), exc_info=exc)
    return error_response(request, "INTERNAL_ERROR", "An unexpected error occurred.", 500)


@app.get("/", tags=["Health"])
def root():
    return {"message": "LetLearnTogether API is running"}


@app.get("/health", tags=["Health"])
def health():
    from sqlalchemy import text

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok"}


for route_group in (auth, users, courses, documents, verification, reports, quizzes):
    app.include_router(route_group.router, prefix="/api/v1")
