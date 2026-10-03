from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[NexaAI] Starting {settings.app_name}")
    print(f"[NexaAI] Environment: {settings.app_env}")
    print(f"[NexaAI] LLM Provider: {settings.llm_provider}")
    print(f"[NexaAI] LLM Model: {settings.llm_model}")
    print(f"[NexaAI] Available Models: {settings.available_models}")

    yield

    print("[NexaAI] Shutting down")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="NexaAI API",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router)


@app.get("/")
def root():
    return {
        "name": settings.app_name,
        "status": "online",
        "environment": settings.app_env,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": settings.app_name,
    }