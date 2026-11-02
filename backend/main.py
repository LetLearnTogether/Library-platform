<<<<<<< HEAD
# Backwards-compatible entry point for `uvicorn main:app` from backend/.
from app.main import app

__all__ = ["app"]
=======
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.database import engine, Base
from backend.app.routers import auth, documents, verification, quizzes

# Create tables on startup (for local dev only)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="LetLearnTogether API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(verification.router, prefix="/api/v1")
app.include_router(quizzes.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected"}
>>>>>>> 9528878 (feat: complete backend API with secure env config, MySQL integration, and full documentation)
